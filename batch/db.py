"""
Supabase接続モジュール
データベース操作を提供
"""
from typing import Any
from supabase import create_client, Client
from loguru import logger
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

_client: Client | None = None


def get_client() -> Client:
    """Supabaseクライアントを取得（シングルトン）"""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です")
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase接続完了")
    return _client


def get_watched_tickers() -> list[str]:
    """登録銘柄コード一覧を取得"""
    client = get_client()
    result = client.table("watched_tickers").select("company_code").execute()
    codes = [r["company_code"] for r in result.data] if result.data else []
    logger.info(f"登録銘柄数: {len(codes)}")
    return codes


def add_watched_ticker(company_code: str) -> bool:
    """銘柄を登録"""
    try:
        client = get_client()
        client.table("watched_tickers").upsert({
            "company_code": company_code
        }).execute()
        logger.info(f"銘柄登録: {company_code}")
        return True
    except Exception as e:
        logger.error(f"銘柄登録エラー: {company_code} - {e}")
        return False


def remove_watched_ticker(company_code: str) -> bool:
    """銘柄を削除"""
    try:
        client = get_client()
        client.table("watched_tickers").delete().eq(
            "company_code", company_code
        ).execute()
        logger.info(f"銘柄削除: {company_code}")
        return True
    except Exception as e:
        logger.error(f"銘柄削除エラー: {company_code} - {e}")
        return False


def upsert_companies(records: list[dict]) -> int:
    """企業データをupsert"""
    if not records:
        return 0

    client = get_client()
    result = client.table("screened_latest").upsert(
        records,
        on_conflict="company_code"
    ).execute()

    count = len(result.data) if result.data else 0
    logger.info(f"upsert完了: {count}件")
    return count


def update_price(company_code: str, price_data: dict) -> bool:
    """株価・時価総額を更新"""
    try:
        client = get_client()
        client.table("screened_latest").update({
            "stock_price": price_data.get("stock_price"),
            "market_cap": price_data.get("market_cap"),
            "price_updated_at": "now()",
            "data_status": "fresh",
        }).eq("company_code", company_code).execute()
        return True
    except Exception as e:
        logger.error(f"株価更新エラー: {company_code} - {e}")
        return False


def get_all_codes() -> list[str]:
    """screened_latestの全銘柄コードを取得"""
    client = get_client()
    result = client.table("screened_latest").select("company_code").execute()
    return [r["company_code"] for r in result.data] if result.data else []


def get_screened(company_code: str) -> dict[str, Any] | None:
    """スクリーニング結果を取得"""
    try:
        client = get_client()
        result = client.table("screened_latest").select("*").eq(
            "company_code", company_code
        ).single().execute()
        return result.data
    except Exception:
        return None


def mark_stale(company_codes: list[str], reason: str) -> int:
    """指定銘柄をstale状態にする"""
    if not company_codes:
        return 0

    client = get_client()
    for code in company_codes:
        try:
            # 既存のreview_reasonsを取得
            existing = get_screened(code)
            review_reasons = []
            if existing and existing.get("review_reasons"):
                review_reasons = existing["review_reasons"]

            # 理由を追加（重複チェック）
            reason_obj = {"code": reason, "message": reason}
            if not any(r.get("code") == reason for r in review_reasons):
                review_reasons.append(reason_obj)

            client.table("screened_latest").update({
                "data_status": "stale",
                "status": "REVIEW",
                "review_reasons": review_reasons,
            }).eq("company_code", code).execute()
        except Exception as e:
            logger.error(f"stale設定エラー: {code} - {e}")

    logger.warning(f"stale設定: {len(company_codes)}件 - {reason}")
    return len(company_codes)


def get_shikiho_estimate(company_code: str) -> dict[str, Any] | None:
    """四季報予想データを取得"""
    try:
        client = get_client()
        result = client.table("shikiho_estimates").select("*").eq(
            "company_code", company_code
        ).single().execute()
        return result.data
    except Exception:
        return None
