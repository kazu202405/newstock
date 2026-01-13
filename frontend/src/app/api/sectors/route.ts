import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/sectors
 * セクター一覧を取得（フィルタ用）
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("screened_latest")
      .select("sector")
      .not("sector", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ユニークなセクター一覧を作成
    const sectors = [...new Set(data?.map((d) => d.sector).filter(Boolean))];
    sectors.sort();

    return NextResponse.json({ sectors });
  } catch (error) {
    console.error("セクター取得エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
