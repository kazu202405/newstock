import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
};

/**
 * GET /api/stocks/search?code=7203
 * 銘柄コードから基本情報を取得（Yahoo Finance経由）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "銘柄コードを指定してください" }, { status: 400 });
  }

  // 4桁の数字かチェック
  if (!/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "4桁の証券コードを入力してください" }, { status: 400 });
  }

  try {
    // Yahoo Finance APIから取得
    const ticker = `${code}.T`;
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail,summaryProfile`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 }, // 5分キャッシュ
    });

    if (!response.ok) {
      // Yahoo Finance JPのページから情報取得を試みる
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

    // 時価総額を億円に変換
    const marketCapRaw = price.marketCap?.raw;
    const marketCapOku = marketCapRaw ? marketCapRaw / 100000000 : null;

    const stockInfo: StockInfo = {
      code: code,
      name: price.shortName || price.longName || `銘柄 ${code}`,
      market: price.exchangeName || "東証",
      sector: profile.industry || profile.sector || "—",
      price: price.regularMarketPrice?.raw || null,
      marketCap: marketCapOku,
      per: summary.trailingPE?.raw || null,
      pbr: summary.priceToBook?.raw || null,
      dividendYield: summary.dividendYield?.raw ? summary.dividendYield.raw * 100 : null,
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
    // Yahoo Finance JP の株価ページをスクレイピング
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

    // HTMLから情報を抽出
    const nameMatch = html.match(/<h1[^>]*class="[^"]*_1LQrC[^"]*"[^>]*>([^<]+)</);
    const priceMatch = html.match(/<span[^>]*class="[^"]*_3BGK5[^"]*"[^>]*>([0-9,]+)</);

    // タイトルから会社名を取得（フォールバック）
    const titleMatch = html.match(/<title>([^【]+)/);
    const name = nameMatch?.[1] || titleMatch?.[1]?.trim() || `銘柄 ${code}`;

    const priceStr = priceMatch?.[1]?.replace(/,/g, "");
    const price = priceStr ? parseInt(priceStr, 10) : null;

    const stockInfo: StockInfo = {
      code: code,
      name: name,
      market: "東証",
      sector: "—",
      price: price,
      marketCap: null,
      per: null,
      pbr: null,
      dividendYield: null,
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
