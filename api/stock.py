"""
株式データ取得API（Python/yfinance）
Vercel Serverless Function
"""

from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from urllib.parse import parse_qs, urlparse


def get_stock_data(code: str) -> dict:
    """yfinanceを使って株式データを取得"""
    symbol = f"{code}.T"

    try:
        ticker = yf.Ticker(symbol)

        # fast_info から取得
        fast_info = ticker.fast_info
        info = ticker.info

        # 時価総額（億円）
        market_cap_raw = getattr(fast_info, 'market_cap', None) or info.get('marketCap')
        market_cap = market_cap_raw / 100000000 if market_cap_raw else None

        # 各種指標
        per = getattr(fast_info, 'pe_ratio', None) or info.get('trailingPE') or info.get('forwardPE')
        pbr = getattr(fast_info, 'price_to_book', None) or info.get('priceToBook')
        dividend_yield_raw = getattr(fast_info, 'dividend_yield', None) or info.get('dividendYield')
        dividend_yield = dividend_yield_raw * 100 if dividend_yield_raw and dividend_yield_raw < 1 else dividend_yield_raw

        # 株価
        price = getattr(fast_info, 'last_price', None) or info.get('regularMarketPrice') or info.get('currentPrice')

        # 名前
        name = info.get('longName') or info.get('shortName') or f"銘柄 {code}"

        # セクター
        sector = info.get('industry') or info.get('sector')

        # 営業利益率
        operating_margin_raw = info.get('operatingMargins')
        operating_margin = operating_margin_raw * 100 if operating_margin_raw else None

        # ROA
        roa_raw = info.get('returnOnAssets')
        roa = roa_raw * 100 if roa_raw else None

        # 自己資本比率（D/Eから逆算）
        debt_to_equity = info.get('debtToEquity')
        equity_ratio = None
        if debt_to_equity is not None:
            equity_ratio = (1 / (1 + debt_to_equity / 100)) * 100

        # 売上成長率
        revenue_growth_raw = info.get('revenueGrowth')
        revenue_growth = revenue_growth_raw * 100 if revenue_growth_raw else None

        return {
            "success": True,
            "data": {
                "company_code": code,
                "company_name": name,
                "sector": sector,
                "market": "東証",
                "market_cap": market_cap,
                "stock_price": price,
                "per_forward": per,
                "pbr": pbr,
                "operating_margin": operating_margin,
                "roa": roa,
                "equity_ratio": equity_ratio,
                "revenue_growth_1y_cy": revenue_growth,
                "dividend_yield": dividend_yield,
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # URLパラメータ取得
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        code = params.get('code', [None])[0]

        if not code:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "code parameter required"}).encode())
            return

        # 4桁チェック
        if not code.isdigit() or len(code) != 4:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "code must be 4 digits"}).encode())
            return

        # データ取得
        result = get_stock_data(code)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode())
