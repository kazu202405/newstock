"""
財務データ取得

yfinance/yahooqueryから財務データを取得する。
"""
import yfinance as yf
from yahooquery import Ticker
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential
from datetime import datetime
from typing import Any
import sys
sys.path.append("..")
from db import get_shikiho_estimate

# 億円換算用（日本円）
HUNDRED_MILLION = 100_000_000


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_financial_data(company_code: str) -> dict[str, Any]:
    """
    1銘柄の財務データを取得

    Args:
        company_code: 証券コード（例: "7203"）

    Returns:
        財務データのdict（screened_latestのカラムに対応）
    """
    ticker_symbol = f"{company_code}.T"  # 東証銘柄は.Tサフィックス

    try:
        # yfinanceとyahooqueryの両方から取得
        yf_ticker = yf.Ticker(ticker_symbol)
        yq_ticker = Ticker(ticker_symbol)

        # 基本情報
        info = yf_ticker.info or {}

        # 財務諸表（年次）
        financials = yf_ticker.financials  # 損益計算書
        balance = yf_ticker.balance_sheet  # 貸借対照表
        cashflow = yf_ticker.cashflow  # キャッシュフロー

        # yahooquery からアナリスト予想
        earnings_trend = yq_ticker.earnings_trend.get(ticker_symbol, {})
        analyst_estimates = _extract_analyst_estimates(earnings_trend)

        # 会社予想（可能なら取得）
        company_estimates = _extract_company_estimates(yq_ticker, ticker_symbol)

        # データ抽出・計算
        result = {
            "company_code": company_code,
            "company_name": info.get("longName") or info.get("shortName", ""),
            "sector": info.get("sector", ""),
            "market": "",  # JPXリストから取得するため空
            "listing_date": _parse_listing_date(info.get("firstTradeDateEpochUtc")),

            # 時価総額・株価
            "market_cap": _to_oku(info.get("marketCap")),
            "stock_price": info.get("currentPrice") or info.get("regularMarketPrice"),

            # 売上高（過去2期 + 予想2期）
            "revenue_2y": _get_financial_value(financials, "Total Revenue", 1),
            "revenue_1y": _get_financial_value(financials, "Total Revenue", 0),
            "revenue_cy": analyst_estimates.get("revenue_cy"),
            "revenue_ny": analyst_estimates.get("revenue_ny"),

            # 営業利益
            "op_2y": _get_financial_value(financials, "Operating Income", 1),
            "op_1y": _get_financial_value(financials, "Operating Income", 0),
            "op_cy": analyst_estimates.get("op_cy"),
            "op_ny": analyst_estimates.get("op_ny"),

            # 財務
            "total_assets": _get_financial_value(balance, "Total Assets", 0),
            "equity": _get_financial_value(balance, "Stockholders Equity", 0),
            "net_income": _get_financial_value(financials, "Net Income", 0),
            "operating_cf": _get_financial_value(cashflow, "Operating Cash Flow", 0),
            "investing_cf": _get_financial_value(cashflow, "Investing Cash Flow", 0),

            # バリュエーション
            "per_forward": info.get("forwardPE"),
            "pbr": info.get("priceToBook"),
            "dividend_yield": _to_percent(info.get("dividendYield")),

            # メタ情報
            "data_source": "yfinance",
            "updated_at": datetime.now().isoformat(),
        }

        # 計算値を追加
        result = _calculate_metrics(result, analyst_estimates, company_estimates, company_code)

        logger.debug(f"財務データ取得完了: {company_code}")
        return result

    except Exception as e:
        logger.error(f"財務データ取得失敗 {company_code}: {e}")
        return {
            "company_code": company_code,
            "company_name": "",
            "data_status": "stale",
            "status": "REVIEW",
            "review_reasons": [{"code": "FETCH_FAILED", "message": f"データ取得失敗: {str(e)}"}],
        }


def _extract_analyst_estimates(earnings_trend: Any) -> dict:
    """yahooquery earnings_trendからアナリスト予想を抽出"""
    estimates = {}

    if not isinstance(earnings_trend, dict) or "trend" not in earnings_trend:
        return estimates

    trends = earnings_trend.get("trend", [])
    for trend in trends:
        period = trend.get("period", "")
        # 今期予想（0y）
        if period == "0y":
            estimates["revenue_cy"] = _to_oku(trend.get("revenueEstimate", {}).get("avg"))
            estimates["earnings_cy"] = _to_oku(trend.get("earningsEstimate", {}).get("avg"))
            # 営業利益予想（推定：売上×過去営業利益率）
            estimates["analyst_revenue_cy"] = estimates["revenue_cy"]
        # 来期予想（+1y）
        elif period == "+1y":
            estimates["revenue_ny"] = _to_oku(trend.get("revenueEstimate", {}).get("avg"))
            estimates["earnings_ny"] = _to_oku(trend.get("earningsEstimate", {}).get("avg"))
            estimates["analyst_revenue_ny"] = estimates["revenue_ny"]

    return estimates


def _extract_company_estimates(yq_ticker: Ticker, ticker_symbol: str) -> dict:
    """会社予想を抽出"""
    estimates = {}

    try:
        # yahooquery から会社ガイダンスを取得
        earnings = yq_ticker.earning_history.get(ticker_symbol, {})
        if isinstance(earnings, dict):
            # 会社予想がある場合
            estimates["company_revenue_cy"] = None  # 直接取得困難
            estimates["company_op_cy"] = None
    except Exception:
        pass

    return estimates


def _calculate_metrics(data: dict, analyst_estimates: dict, company_estimates: dict, company_code: str) -> dict:
    """計算指標を算出"""
    review_reasons = data.get("review_reasons", []) or []

    # 自己資本比率
    if data.get("equity") and data.get("total_assets") and data["total_assets"] != 0:
        data["equity_ratio"] = (data["equity"] / data["total_assets"]) * 100
    else:
        data["equity_ratio"] = None
        review_reasons.append({"code": "MISSING_EQUITY_RATIO", "field": "equity_ratio", "message": "自己資本比率データ不足"})

    # 売上高増減率
    data["revenue_growth_2y_1y"] = _calc_growth(data.get("revenue_2y"), data.get("revenue_1y"), review_reasons, "revenue_growth_2y_1y")
    data["revenue_growth_1y_cy"] = _calc_growth(data.get("revenue_1y"), data.get("revenue_cy"), review_reasons, "revenue_growth_1y_cy")
    data["revenue_growth_cy_ny"] = _calc_growth(data.get("revenue_cy"), data.get("revenue_ny"), review_reasons, "revenue_growth_cy_ny")

    # 営業利益増減率
    data["op_growth_2y_1y"] = _calc_growth(data.get("op_2y"), data.get("op_1y"), review_reasons, "op_growth_2y_1y")
    data["op_growth_1y_cy"] = _calc_growth(data.get("op_1y"), data.get("op_cy"), review_reasons, "op_growth_1y_cy")
    data["op_growth_cy_ny"] = _calc_growth(data.get("op_cy"), data.get("op_ny"), review_reasons, "op_growth_cy_ny")

    # 売上高営業利益率
    if data.get("revenue_1y") and data.get("op_1y") and data["revenue_1y"] != 0:
        data["operating_margin"] = (data["op_1y"] / data["revenue_1y"]) * 100
    else:
        data["operating_margin"] = None
        review_reasons.append({"code": "CALC_FAILED", "field": "operating_margin", "message": "営業利益率計算不可"})

    # ROA
    if data.get("net_income") and data.get("total_assets") and data["total_assets"] != 0:
        data["roa"] = (data["net_income"] / data["total_assets"]) * 100
    else:
        data["roa"] = None
        review_reasons.append({"code": "MISSING_ROA", "field": "roa", "message": "ROAデータ不足"})

    # フリーCF
    if data.get("operating_cf") is not None and data.get("investing_cf") is not None:
        data["free_cf"] = data["operating_cf"] + data["investing_cf"]
    else:
        data["free_cf"] = None
        review_reasons.append({"code": "CALC_FAILED", "field": "free_cf", "message": "フリーCF計算不可"})

    # TK会社乖離（四季報優先、なければアナリスト予想乖離で代替）
    shikiho = get_shikiho_estimate(company_code)

    if shikiho and shikiho.get("shikiho_revenue"):
        # 四季報データがある場合
        company_rev = data.get("revenue_cy")
        shikiho_rev = shikiho.get("shikiho_revenue")
        if company_rev and shikiho_rev and shikiho_rev != 0:
            data["tk_deviation_revenue"] = ((company_rev - shikiho_rev) / shikiho_rev) * 100
        else:
            data["tk_deviation_revenue"] = None

        company_op = data.get("op_cy")
        shikiho_op = shikiho.get("shikiho_op")
        if company_op and shikiho_op and shikiho_op != 0:
            data["tk_deviation_op"] = ((company_op - shikiho_op) / shikiho_op) * 100
        else:
            data["tk_deviation_op"] = None
    else:
        # アナリスト予想乖離で代替（会社予想 vs アナリスト予想）
        # 注：会社予想が取得困難なため、現状はREVIEWにする
        data["tk_deviation_revenue"] = None
        data["tk_deviation_op"] = None
        review_reasons.append({
            "code": "ANALYST_DATA_UNAVAILABLE",
            "field": "tk_deviation",
            "message": "TK会社乖離データ取得不可（要確認）"
        })

    if review_reasons:
        data["review_reasons"] = review_reasons

    return data


def _calc_growth(prev: float | None, curr: float | None, reasons: list, field: str) -> float | None:
    """増減率を計算"""
    if prev is None or curr is None:
        reasons.append({"code": "DATA_MISSING", "field": field, "message": "データ取得不可（要確認）"})
        return None
    if prev == 0:
        reasons.append({"code": "DIVISION_BY_ZERO", "field": field, "message": "計算不可（前期=0）"})
        return None
    return ((curr - prev) / abs(prev)) * 100


def _get_financial_value(df, key: str, year_offset: int = 0) -> float | None:
    """財務諸表から値を取得（億円換算）"""
    if df is None or df.empty:
        return None
    try:
        if key in df.index:
            columns = df.columns.tolist()
            if len(columns) > year_offset:
                value = df.loc[key, columns[year_offset]]
                return _to_oku(value)
    except Exception:
        pass
    return None


def _to_oku(value: Any) -> float | None:
    """億円に換算"""
    if value is None or (isinstance(value, float) and value != value):  # NaN check
        return None
    try:
        return float(value) / HUNDRED_MILLION
    except (TypeError, ValueError):
        return None


def _to_percent(value: Any) -> float | None:
    """パーセント換算（0.05 -> 5.0）"""
    if value is None or (isinstance(value, float) and value != value):
        return None
    try:
        return float(value) * 100
    except (TypeError, ValueError):
        return None


def _parse_listing_date(epoch: int | None) -> str | None:
    """上場日を解析"""
    if epoch is None:
        return None
    try:
        return datetime.fromtimestamp(epoch).strftime("%Y-%m-%d")
    except Exception:
        return None


if __name__ == "__main__":
    # テスト実行
    import json
    logger.remove()
    logger.add(sys.stderr, level="DEBUG")

    # トヨタ自動車でテスト
    result = fetch_financial_data("7203")
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
