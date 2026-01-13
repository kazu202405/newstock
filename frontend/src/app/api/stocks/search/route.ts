import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ScreeningResult = {
  field: string;
  name: string;
  value: number | string | null;
  threshold: string;
  status: "ok" | "ng" | "unknown";
};

type StockInfo = {
  code: string;
  name: string;
  market: string;
  sector: string;
  price: number | null;
  marketCap: number | null; // 億円
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  // スクリーニング用追加データ
  operatingMargin: number | null;
  roa: number | null;
  equityRatio: number | null;
  revenueGrowth: number | null;
  // スクリーニング結果
  screening: {
    passCount: number;
    failCount: number;
    unknownCount: number;
    results: ScreeningResult[];
  };
};

// スクリーニング条件
const SCREENING_CONDITIONS = [
  { field: "tk_deviation", name: "TK会社乖離", op: ">", value: 0, unit: "%" },
  { field: "market_cap", name: "時価総額", op: "<=", value: 700, unit: "億円" },
  { field: "equity_ratio", name: "自己資本比率", op: ">=", value: 30, unit: "%" },
  { field: "revenue_growth", name: "売上高増減率", op: ">", value: 0, unit: "%" },
  { field: "operating_margin", name: "営業利益率", op: ">=", value: 10, unit: "%" },
  { field: "roa", name: "ROA", op: ">", value: 4.5, unit: "%" },
  { field: "per", name: "PER", op: "<", value: 40, unit: "倍" },
  { field: "pbr", name: "PBR", op: "<", value: 10, unit: "倍" },
];

function evaluateCondition(
  value: number | null,
  op: string,
  threshold: number
): "ok" | "ng" | "unknown" {
  if (value === null || value === undefined || isNaN(value)) {
    return "unknown";
  }

  switch (op) {
    case ">":
      return value > threshold ? "ok" : "ng";
    case ">=":
      return value >= threshold ? "ok" : "ng";
    case "<":
      return value < threshold ? "ok" : "ng";
    case "<=":
      return value <= threshold ? "ok" : "ng";
    default:
      return "unknown";
  }
}

/**
 * GET /api/stocks/search?code=7203
 * 銘柄コードから基本情報とスクリーニング結果を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "銘柄コードを指定してください" }, { status: 400 });
  }

  if (!/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "4桁の証券コードを入力してください" }, { status: 400 });
  }

  try {
    const ticker = `${code}.T`;
    // 追加のモジュールを取得
    const modules = [
      "price",
      "summaryDetail",
      "summaryProfile",
      "financialData",
      "defaultKeyStatistics",
    ].join(",");
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return await fetchFromYahooJP(code);
    }

    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];

    if (!result) {
      return await fetchFromYahooJP(code);
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

    // 自己資本比率（総資産と株主資本から概算）
    // Yahoo Financeでは直接提供されないので、debtToEquityから逆算
    let equityRatio: number | null = null;
    const debtToEquity = financial.debtToEquity?.raw;
    if (debtToEquity !== undefined && debtToEquity !== null) {
      // D/E = 負債 / 自己資本 → 自己資本比率 = 1 / (1 + D/E) * 100
      equityRatio = (1 / (1 + debtToEquity / 100)) * 100;
    }

    // スクリーニング実行
    const screeningData: Record<string, number | null> = {
      tk_deviation: null, // 四季報データがないので不明
      market_cap: marketCapOku,
      equity_ratio: equityRatio,
      revenue_growth: revenueGrowth,
      operating_margin: operatingMargin,
      roa: roa,
      per: per,
      pbr: pbr,
    };

    const screeningResults: ScreeningResult[] = SCREENING_CONDITIONS.map((cond) => {
      const value = screeningData[cond.field];
      const status = evaluateCondition(value, cond.op, cond.value);
      return {
        field: cond.field,
        name: cond.name,
        value: value,
        threshold: `${cond.op} ${cond.value}${cond.unit}`,
        status,
      };
    });

    const passCount = screeningResults.filter((r) => r.status === "ok").length;
    const failCount = screeningResults.filter((r) => r.status === "ng").length;
    const unknownCount = screeningResults.filter((r) => r.status === "unknown").length;

    const stockInfo: StockInfo = {
      code,
      name: price.shortName || price.longName || `銘柄 ${code}`,
      market: price.exchangeName || "東証",
      sector: profile.industry || profile.sector || "—",
      price: price.regularMarketPrice?.raw || null,
      marketCap: marketCapOku,
      per,
      pbr,
      dividendYield: summary.dividendYield?.raw ? summary.dividendYield.raw * 100 : null,
      operatingMargin,
      roa,
      equityRatio,
      revenueGrowth,
      screening: {
        passCount,
        failCount,
        unknownCount,
        results: screeningResults,
      },
    };

    return NextResponse.json({ stock: stockInfo });
  } catch (error) {
    console.error("銘柄検索エラー:", error);
    return await fetchFromYahooJP(code);
  }
}

/**
 * Yahoo Finance JPから情報を取得（フォールバック）
 */
async function fetchFromYahooJP(code: string): Promise<NextResponse> {
  try {
    const url = `https://finance.yahoo.co.jp/quote/${code}.T`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "銘柄が見つかりませんでした" },
        { status: 404 }
      );
    }

    const html = await response.text();
    const nameMatch = html.match(/<h1[^>]*class="[^"]*_1LQrC[^"]*"[^>]*>([^<]+)</);
    const priceMatch = html.match(/<span[^>]*class="[^"]*_3BGK5[^"]*"[^>]*>([0-9,]+)</);
    const titleMatch = html.match(/<title>([^【]+)/);
    const name = nameMatch?.[1] || titleMatch?.[1]?.trim() || `銘柄 ${code}`;
    const priceStr = priceMatch?.[1]?.replace(/,/g, "");
    const priceVal = priceStr ? parseInt(priceStr, 10) : null;

    // フォールバック時はスクリーニング不可
    const screeningResults: ScreeningResult[] = SCREENING_CONDITIONS.map((cond) => ({
      field: cond.field,
      name: cond.name,
      value: null,
      threshold: `${cond.op} ${cond.value}${cond.unit}`,
      status: "unknown" as const,
    }));

    const stockInfo: StockInfo = {
      code,
      name,
      market: "東証",
      sector: "—",
      price: priceVal,
      marketCap: null,
      per: null,
      pbr: null,
      dividendYield: null,
      operatingMargin: null,
      roa: null,
      equityRatio: null,
      revenueGrowth: null,
      screening: {
        passCount: 0,
        failCount: 0,
        unknownCount: SCREENING_CONDITIONS.length,
        results: screeningResults,
      },
    };

    return NextResponse.json({ stock: stockInfo });
  } catch (error) {
    console.error("Yahoo JP検索エラー:", error);
    return NextResponse.json(
      { error: "銘柄情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
