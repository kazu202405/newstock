"""株価データ取得

yfinanceから株価・時価総額を取得する。
"""
import yfinance as yf
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential
from datetime import datetime
from typing import Any

HUNDRED_MILLION = 100_000_000


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_price_data(company_code: str) -> dict[str, Any]:
    """
    1銘柄の株価データを取得

    Args:
        company_code: 証券コード（例: "7203"）

    Returns:
        株価データのdict
    """
    ticker_symbol = f"{company_code}.T"

    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info or {}

        result = {
            "company_code": company_code,
            "stock_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "market_cap": _to_oku(info.get("marketCap")),
            "price_updated_at": datetime.now().isoformat(),
            "data_status": "fresh",
        }

        logger.debug(f"株価取得完了: {company_code} - ¥{result['stock_price']}")
        return result

    except Exception as e:
        logger.error(f"株価取得失敗 {company_code}: {e}")
        return {
            "company_code": company_code,
            "data_status": "stale",
        }


def fetch_price_batch(company_codes: list[str]) -> list[dict]:
    """
    複数銘柄の株価を一括取得

    yfinanceのバッチ取得機能を使用して効率化
    """
    if not company_codes:
        return []

    ticker_symbols = [f"{code}.T" for code in company_codes]

    try:
        # 一括取得（最大100件程度が推奨）
        tickers = yf.Tickers(" ".join(ticker_symbols))

        results = []
        for code in company_codes:
            symbol = f"{code}.T"
            try:
                info = tickers.tickers[symbol].info
                results.append({
                    "company_code": code,
                    "stock_price": info.get("currentPrice") or info.get("regularMarketPrice"),
                    "market_cap": _to_oku(info.get("marketCap")),
                    "price_updated_at": datetime.now().isoformat(),
                    "data_status": "fresh",
                })
            except Exception as e:
                logger.warning(f"株価取得失敗 {code}: {e}")
                results.append({
                    "company_code": code,
                    "data_status": "stale",
                })

        logger.info(f"株価バッチ取得完了: {len(results)}件")
        return results

    except Exception as e:
        logger.error(f"株価バッチ取得失敗: {e}")
        return [{"company_code": code, "data_status": "stale"} for code in company_codes]


def _to_oku(value: Any) -> float | None:
    """億円に換算"""
    if value is None or (isinstance(value, float) and value != value):
        return None
    try:
        return float(value) / HUNDRED_MILLION
    except (TypeError, ValueError):
        return None


if __name__ == "__main__":
    # テスト実行
    import json
    import sys
    logger.remove()
    logger.add(sys.stderr, level="DEBUG")

    # 単一取得テスト
    result = fetch_price_data("7203")
    print("単一取得:")
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    # バッチ取得テスト
    codes = ["7203", "6758", "9984"]  # トヨタ、ソニー、ソフトバンク
    results = fetch_price_batch(codes)
    print("\nバッチ取得:")
    for r in results:
        print(json.dumps(r, indent=2, ensure_ascii=False, default=str))
