"""
バッチ設定
環境変数とスクリーニング条件を管理
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# .envファイル読み込み（プロジェクトルートから）
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# バッチ設定
BATCH_CONCURRENCY = int(os.getenv("BATCH_CONCURRENCY", "5"))
BATCH_RETRY_MAX = int(os.getenv("BATCH_RETRY_MAX", "3"))

# スクリーニング条件（閾値）
# field: {"op": 演算子, "value": 閾値, "display_only": 表示のみか}
SCREENING_CONDITIONS = {
    "tk_deviation_revenue": {"op": ">", "value": 0.00, "name": "TK会社乖離(売上高)(%)"},
    "tk_deviation_op": {"op": ">", "value": 0.00, "name": "TK会社乖離(営業利益)(%)"},
    "market_cap": {"op": "<=", "value": 700.00, "name": "時価総額(億円)"},
    "equity_ratio": {"op": ">=", "value": 30.00, "name": "自己資本比率(前期)(%)"},
    "revenue_growth_2y_1y": {"op": ">", "value": 0.00, "name": "売上高増減率(2期前→前期)(%)"},
    "revenue_growth_1y_cy": {"op": ">", "value": 0.00, "name": "売上高増減率(前期→今期予)(%)"},
    "revenue_growth_cy_ny": {"op": ">", "value": 0.00, "name": "売上高増減率(今期予→来期予)(%)"},
    "operating_margin": {"op": ">=", "value": 10.00, "name": "売上高営業利益率(前期)(%)"},
    "op_growth_2y_1y": {"op": ">", "value": 0.00, "name": "営業利益増減率(2期前→前期)(%)"},
    "op_growth_1y_cy": {"op": ">", "value": 0.00, "name": "営業利益増減率(前期→今期予)(%)"},
    "op_growth_cy_ny": {"op": ">", "value": 0.00, "name": "営業利益増減率(今期予→来期予)(%)"},
    "operating_cf": {"op": ">", "value": 0.00, "name": "営業CF前期(億円)"},
    "free_cf": {"op": ">", "value": 0.00, "name": "フリーCF前期(億円)"},
    "listing_date": {"op": ">", "value": "2012-12-01", "name": "上場年月"},
    "roa": {"op": ">", "value": 4.50, "name": "ROA(前期)(%)"},
    "per_forward": {"op": "<", "value": 40.00, "name": "PER(来期)(倍)"},
    "pbr": {"op": "<", "value": 10.00, "name": "PBR(直近Q)(倍)"},
}

# 表示専用項目（判定に含めない）
DISPLAY_ONLY_FIELDS = ["dividend_yield"]

# 市場区分
MARKETS = ["プライム", "スタンダード", "グロース"]

# 除外銘柄タイプ（ETF, REIT等）
EXCLUDED_TYPES = ["ETF", "ETN", "REIT", "優先株"]

# 理由コード
REASON_CODES = {
    "FETCH_FAILED": "データ取得失敗",
    "ANALYST_DATA_UNAVAILABLE": "アナリスト予想データ取得不可",
    "DIV_BY_ZERO_REVENUE_GROWTH_1Y_CY": "計算不可（前期売上=0）",
    "DIV_BY_ZERO_OP_GROWTH_1Y_CY": "計算不可（前期営利=0）",
    "MISSING_EQUITY_RATIO": "自己資本比率データ不足",
    "MISSING_ROA": "ROAデータ不足",
    "DATA_MISSING": "データ取得不可（要確認）",
    "DIVISION_BY_ZERO": "計算不可（前期=0）",
}
