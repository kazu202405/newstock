import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * ヘルスチェック
 */
export async function GET() {
  try {
    // DB接続確認
    const { count, error } = await supabase
      .from("watched_tickers")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          status: "unhealthy",
          database: "error",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // スクリーニング結果のサマリー取得
    const { data: summary } = await supabase
      .from("screened_latest")
      .select("status")
      .limit(1000);

    const statusCounts = {
      PASS: 0,
      FAIL: 0,
      REVIEW: 0,
    };

    if (summary) {
      for (const row of summary) {
        if (row.status in statusCounts) {
          statusCounts[row.status as keyof typeof statusCounts]++;
        }
      }
    }

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      watchedTickers: count || 0,
      screenedCompanies: statusCounts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("ヘルスチェックエラー:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "ヘルスチェック失敗",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
