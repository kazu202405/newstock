import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/companies
 * 登録銘柄の一覧を取得（watched_tickersに存在する銘柄のみ）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // パラメータ取得
    const status = searchParams.get("status") || "PASS";
    const q = searchParams.get("q") || "";
    const sector = searchParams.get("sector") || "";
    const minCap = searchParams.get("minCap")
      ? parseFloat(searchParams.get("minCap")!)
      : null;
    const maxCap = searchParams.get("maxCap")
      ? parseFloat(searchParams.get("maxCap")!)
      : null;
    const sort = searchParams.get("sort") || "roa";
    const order = searchParams.get("order") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // 登録銘柄コードを取得
    const { data: watchedTickers, error: watchedError } = await supabase
      .from("watched_tickers")
      .select("company_code");

    if (watchedError) {
      console.error("watched_tickers取得エラー:", watchedError);
      return NextResponse.json({ error: "データ取得エラー" }, { status: 500 });
    }

    const watchedCodes = watchedTickers?.map((t) => t.company_code) || [];

    // 登録銘柄がない場合は空を返す
    if (watchedCodes.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      });
    }

    // クエリ構築
    let query = supabase
      .from("screened_latest")
      .select("*", { count: "exact" })
      .in("company_code", watchedCodes);

    // ステータスフィルタ（FAILはUI非表示）
    if (status === "PASS" || status === "REVIEW") {
      query = query.eq("status", status);
    }

    // 検索（会社名または証券コード）
    if (q) {
      query = query.or(`company_name.ilike.%${q}%,company_code.ilike.%${q}%`);
    }

    // セクターフィルタ
    if (sector) {
      query = query.eq("sector", sector);
    }

    // 時価総額フィルタ
    if (minCap !== null) {
      query = query.gte("market_cap", minCap);
    }
    if (maxCap !== null) {
      query = query.lte("market_cap", maxCap);
    }

    // ソート
    const ascending = order === "asc";
    query = query.order(sort, { ascending, nullsFirst: false });

    // ページング
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("screened_latest取得エラー:", error);
      return NextResponse.json({ error: "データ取得エラー" }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: count ? offset + pageSize < count : false,
    });
  } catch (error) {
    console.error("API エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
