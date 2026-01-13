import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/companies/[code]
 * 銘柄詳細を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // 登録銘柄かチェック
    const { data: watched } = await supabase
      .from("watched_tickers")
      .select("company_code")
      .eq("company_code", code)
      .single();

    if (!watched) {
      return NextResponse.json(
        { error: "銘柄が見つかりません" },
        { status: 404 }
      );
    }

    // 銘柄詳細を取得
    const { data, error } = await supabase
      .from("screened_latest")
      .select("*")
      .eq("company_code", code)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "銘柄データが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
