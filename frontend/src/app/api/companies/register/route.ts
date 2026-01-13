import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Python API経由でyfinanceから株式データを取得
async function fetchStockData(code: string) {
  try {
    // 本番環境ではVercelのPython APIを、開発環境では直接Yahoo Financeを試行
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "";

    // Python APIを呼び出し
    const apiUrl = baseUrl ? `${baseUrl}/py/stock?code=${code}` : null;

    if (apiUrl) {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data;
        }
      }
    }

    // フォールバック: 直接Yahoo Finance APIを試行
    return await fetchFromYahooFinanceDirect(code);
  } catch (error) {
    console.error(`データ取得エラー (${code}):`, error);
    return await fetchFromYahooFinanceDirect(code);
  }
}

// 直接Yahoo Finance APIからデータ取得（フォールバック）
async function fetchFromYahooFinanceDirect(code: string) {
  const ticker = `${code}.T`;
  const modules = [
    "price",
    "summaryDetail",
    "summaryProfile",
    "financialData",
    "defaultKeyStatistics",
  ].join(",");

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];

    if (!result) {
      return null;
    }

    const price = result.price || {};
    const summary = result.summaryDetail || {};
    const profile = result.summaryProfile || {};
    const financial = result.financialData || {};
    const keyStats = result.defaultKeyStatistics || {};

    // 時価総額（億円）
    const marketCapRaw = price.marketCap?.raw;
    const marketCapOku = marketCapRaw ? marketCapRaw / 100000000 : null;

    // 各種指標
    const per = summary.trailingPE?.raw || keyStats.trailingPE?.raw || null;
    const pbr = summary.priceToBook?.raw || keyStats.priceToBook?.raw || null;
    const operatingMargin = financial.operatingMargins?.raw
      ? financial.operatingMargins.raw * 100
      : null;
    const roa = financial.returnOnAssets?.raw
      ? financial.returnOnAssets.raw * 100
      : null;
    const revenueGrowth = financial.revenueGrowth?.raw
      ? financial.revenueGrowth.raw * 100
      : null;

    // 自己資本比率（D/Eから逆算）
    let equityRatio: number | null = null;
    const debtToEquity = financial.debtToEquity?.raw;
    if (debtToEquity !== undefined && debtToEquity !== null) {
      equityRatio = (1 / (1 + debtToEquity / 100)) * 100;
    }

    // 配当利回り
    const dividendYield = summary.dividendYield?.raw
      ? summary.dividendYield.raw * 100
      : null;

    return {
      company_code: code,
      company_name: price.shortName || price.longName || `銘柄 ${code}`,
      sector: profile.industry || profile.sector || null,
      market: price.exchangeName || "東証",
      market_cap: marketCapOku,
      stock_price: price.regularMarketPrice?.raw || null,
      per_forward: per,
      pbr: pbr,
      operating_margin: operatingMargin,
      roa: roa,
      equity_ratio: equityRatio,
      revenue_growth_1y_cy: revenueGrowth,
      dividend_yield: dividendYield,
    };
  } catch (error) {
    console.error(`Yahoo Finance直接取得エラー (${code}):`, error);
    return null;
  }
}

// スクリーニング条件チェック
function evaluateScreening(data: Record<string, unknown>) {
  const conditions = [
    { field: "market_cap", op: "<=", value: 700 },
    { field: "equity_ratio", op: ">=", value: 30 },
    { field: "operating_margin", op: ">=", value: 10 },
    { field: "roa", op: ">", value: 4.5 },
    { field: "per_forward", op: "<", value: 40 },
    { field: "pbr", op: "<", value: 10 },
  ];

  const reviewReasons: { field: string; message: string }[] = [];
  const failedReasons: { field: string; message: string }[] = [];
  let hasUnknown = false;
  let hasFailed = false;

  for (const cond of conditions) {
    const val = data[cond.field] as number | null;

    if (val === null || val === undefined) {
      hasUnknown = true;
      reviewReasons.push({
        field: cond.field,
        message: "データ取得不可",
      });
      continue;
    }

    let passed = false;
    switch (cond.op) {
      case ">":
        passed = val > cond.value;
        break;
      case ">=":
        passed = val >= cond.value;
        break;
      case "<":
        passed = val < cond.value;
        break;
      case "<=":
        passed = val <= cond.value;
        break;
    }

    if (!passed) {
      hasFailed = true;
      failedReasons.push({
        field: cond.field,
        message: `${cond.field} ${cond.op} ${cond.value} を満たしていません`,
      });
    }
  }

  // TK乖離はデータがないのでREVIEW
  reviewReasons.push({
    field: "tk_deviation_revenue",
    message: "四季報データなし（要確認）",
  });
  reviewReasons.push({
    field: "tk_deviation_op",
    message: "四季報データなし（要確認）",
  });

  let status: "PASS" | "FAIL" | "REVIEW";
  if (hasFailed) {
    status = "FAIL";
  } else if (hasUnknown) {
    status = "REVIEW";
  } else {
    // TK乖離がないので常にREVIEW
    status = "REVIEW";
  }

  return { status, reviewReasons, failedReasons };
}

/**
 * POST /api/companies/register
 * 銘柄を一括登録（即時スクリーニング実行）
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

      // 1. watched_tickersに登録
      const { error: watchedError } = await supabase
        .from("watched_tickers")
        .insert({ company_code: normalizedCode });

      if (watchedError) {
        results.failed.push({
          code: normalizedCode,
          reason: watchedError.message,
        });
        continue;
      }

      // 2. Yahoo Financeからデータ取得
      const stockData = await fetchStockData(normalizedCode);

      if (stockData) {
        // 3. スクリーニング実行
        const { status, reviewReasons, failedReasons } = evaluateScreening(stockData);

        // 4. screened_latestに保存
        const { error: screenedError } = await supabase
          .from("screened_latest")
          .upsert({
            ...stockData,
            status,
            review_reasons: reviewReasons,
            failed_reasons: failedReasons,
            updated_at: new Date().toISOString(),
            price_updated_at: new Date().toISOString(),
            data_status: "fresh",
            data_source: "yfinance",
          });

        if (screenedError) {
          console.error(`screened_latest保存エラー (${normalizedCode}):`, screenedError);
        }
      } else {
        // データ取得失敗時も最低限の情報で登録
        await supabase.from("screened_latest").upsert({
          company_code: normalizedCode,
          company_name: `銘柄 ${normalizedCode}`,
          status: "REVIEW",
          review_reasons: [{ field: "all", message: "データ取得失敗（要確認）" }],
          failed_reasons: [],
          updated_at: new Date().toISOString(),
          data_status: "stale",
          data_source: "yfinance",
        });
      }

      results.success.push(normalizedCode);
      existingCodes.add(normalizedCode);
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

    // watched_tickersから削除
    const { error: watchedError } = await supabase
      .from("watched_tickers")
      .delete()
      .eq("company_code", code);

    if (watchedError) {
      return NextResponse.json({ error: watchedError.message }, { status: 500 });
    }

    // screened_latestからも削除
    await supabase
      .from("screened_latest")
      .delete()
      .eq("company_code", code);

    return NextResponse.json({ message: `${code}を削除しました` });
  } catch (error) {
    console.error("削除エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
