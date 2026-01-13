"""
スクリーニング判定ロジック

全条件を満たす場合のみPASS、1つでもNGならFAIL、
欠損/計算不可がある場合はREVIEW
"""
from datetime import datetime
from typing import Any
from loguru import logger
import sys
sys.path.append("..")
from config import SCREENING_CONDITIONS, DISPLAY_ONLY_FIELDS, REASON_CODES


def judge_company(data: dict) -> dict:
    """
    1社のスクリーニング判定を行う

    Args:
        data: 財務データ（fetch_financial_dataの戻り値）

    Returns:
        判定結果を含むdict（status, review_reasons, failed_reasons）
    """
    review_reasons = data.get("review_reasons", []) or []
    failed_reasons = data.get("failed_reasons", []) or []

    # 既にデータ取得失敗でstaleの場合
    if data.get("data_status") == "stale":
        return {
            **data,
            "status": "REVIEW",
            "review_reasons": review_reasons or [{"code": "FETCH_FAILED", "message": "データ取得失敗"}],
            "failed_reasons": [],
        }

    # 各条件をチェック
    has_missing = len(review_reasons) > 0  # 既に欠損理由がある場合
    has_failed = False

    for field, condition in SCREENING_CONDITIONS.items():
        # 表示専用フィールドはスキップ
        if field in DISPLAY_ONLY_FIELDS:
            continue

        value = data.get(field)
        threshold = condition["value"]
        op = condition["op"]
        name = condition.get("name", field)

        # 欠損チェック
        if value is None:
            has_missing = True
            # review_reasonsに既に理由がある場合はスキップ
            if not any(r.get("field") == field for r in review_reasons):
                review_reasons.append({
                    "code": "DATA_MISSING",
                    "field": field,
                    "name": name,
                    "message": "データ取得不可（要確認）"
                })
            continue

        # 条件判定
        passed = _check_condition(value, op, threshold)

        if not passed:
            has_failed = True
            # 条件未達の理由コードを生成
            reason_code = _get_fail_reason_code(field, op, threshold)
            failed_reasons.append({
                "code": reason_code,
                "field": field,
                "name": name,
                "value": round(value, 2) if isinstance(value, (int, float)) else value,
                "condition": f"{op} {threshold}",
                "message": f"{name}: {_format_value(value)} は条件 {op} {threshold} を満たさない"
            })

    # ステータス決定（優先順位: REVIEW > FAIL > PASS）
    if has_missing:
        status = "REVIEW"
    elif has_failed:
        status = "FAIL"
    else:
        status = "PASS"

    result = {
        **data,
        "status": status,
        "review_reasons": review_reasons if review_reasons else [],
        "failed_reasons": failed_reasons if failed_reasons else [],
        "data_status": "fresh",
    }

    logger.debug(f"判定完了: {data.get('company_code')} -> {status}")
    return result


def _check_condition(value: Any, op: str, threshold: Any) -> bool:
    """条件を判定"""
    # 日付の比較
    if isinstance(threshold, str) and "-" in str(threshold):
        try:
            if isinstance(value, str):
                value_date = datetime.strptime(value, "%Y-%m-%d")
            else:
                value_date = value
            threshold_date = datetime.strptime(threshold, "%Y-%m-%d")
            value = value_date
            threshold = threshold_date
        except (ValueError, TypeError):
            return False

    # 数値比較
    try:
        if op == ">":
            return value > threshold
        elif op == ">=":
            return value >= threshold
        elif op == "<":
            return value < threshold
        elif op == "<=":
            return value <= threshold
        elif op == "==":
            return value == threshold
        else:
            logger.warning(f"未知の演算子: {op}")
            return False
    except TypeError:
        return False


def _get_fail_reason_code(field: str, op: str, threshold: Any) -> str:
    """失敗理由コードを生成"""
    field_upper = field.upper()
    if op in [">", ">="]:
        return f"{field_upper}_BELOW_THRESHOLD"
    elif op in ["<", "<="]:
        return f"{field_upper}_ABOVE_THRESHOLD"
    else:
        return f"{field_upper}_NOT_MET"


def _format_value(value: Any) -> str:
    """値を表示用にフォーマット"""
    if value is None:
        return "—"
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def judge_all(companies: list[dict]) -> list[dict]:
    """
    複数社の判定を一括実行

    Args:
        companies: 財務データのリスト

    Returns:
        判定結果のリスト
    """
    results = []
    pass_count = 0
    fail_count = 0
    review_count = 0

    for company in companies:
        result = judge_company(company)
        results.append(result)

        if result["status"] == "PASS":
            pass_count += 1
        elif result["status"] == "FAIL":
            fail_count += 1
        else:
            review_count += 1

    logger.info(f"判定完了: PASS={pass_count}, FAIL={fail_count}, REVIEW={review_count}")
    return results


def get_condition_display() -> list[dict]:
    """
    条件一覧を表示用に整形

    Returns:
        条件リスト（UI表示用）
    """
    result = []
    for field, condition in SCREENING_CONDITIONS.items():
        is_display_only = field in DISPLAY_ONLY_FIELDS
        result.append({
            "field": field,
            "name": condition.get("name", field),
            "operator": condition["op"],
            "threshold": condition["value"],
            "displayOnly": is_display_only,
            "description": f"{condition.get('name', field)} {condition['op']} {condition['value']}"
        })

    return result


def get_reason_message(code: str) -> str:
    """理由コードからメッセージを取得"""
    return REASON_CODES.get(code, code)


if __name__ == "__main__":
    # テスト実行
    import json

    # モックデータでテスト
    test_data = {
        "company_code": "9999",
        "company_name": "テスト株式会社",
        "market_cap": 500.0,
        "equity_ratio": 35.0,
        "revenue_growth_2y_1y": 5.0,
        "revenue_growth_1y_cy": 8.0,
        "revenue_growth_cy_ny": 10.0,
        "operating_margin": 12.0,
        "op_growth_2y_1y": 3.0,
        "op_growth_1y_cy": 5.0,
        "op_growth_cy_ny": 7.0,
        "operating_cf": 10.0,
        "free_cf": 5.0,
        "listing_date": "2015-01-01",
        "roa": 6.0,
        "per_forward": 20.0,
        "pbr": 3.0,
        "tk_deviation_revenue": 2.0,
        "tk_deviation_op": 1.5,
    }

    result = judge_company(test_data)
    print("判定結果:")
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    # 条件一覧
    print("\n条件一覧:")
    for cond in get_condition_display():
        print(f"  {cond['description']}")
