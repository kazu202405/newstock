import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/companies/register
 * 銘柄を一括登録
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codes } = body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: "銘柄コードが指定されていません" },
        { status: 400 }
      );
    }

    // 重複チェック用に既存の登録銘柄を取得
    const { data: existingTickers } = await supabase
      .from("watched_tickers")
      .select("company_code");

    const existingCodes = new Set(
      existingTickers?.map((t) => t.company_code) || []
    );

    const results = {
      success: [] as string[],
      failed: [] as { code: string; reason: string }[],
      duplicate: [] as string[],
    };

    // 各銘柄を処理
    for (const code of codes) {
      // 正規化（4桁の数字のみ許可）
      const normalizedCode = code.toString().trim();

      if (!/^\d{4}$/.test(normalizedCode)) {
        results.failed.push({
          code: normalizedCode,
          reason: "証券コードは4桁の数字である必要があります",
        });
        continue;
      }

      if (existingCodes.has(normalizedCode)) {
        results.duplicate.push(normalizedCode);
        continue;
      }

      // 登録
      const { error } = await supabase.from("watched_tickers").insert({
        company_code: normalizedCode,
      });

      if (error) {
        results.failed.push({
          code: normalizedCode,
          reason: error.message,
        });
      } else {
        results.success.push(normalizedCode);
        existingCodes.add(normalizedCode);
      }
    }

    return NextResponse.json({
      message: `登録完了: ${results.success.length}件`,
      results,
    });
  } catch (error) {
    console.error("登録エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/register
 * 銘柄を削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "銘柄コードが指定されていません" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("watched_tickers")
      .delete()
      .eq("company_code", code);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: `${code}を削除しました` });
  } catch (error) {
    console.error("削除エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
