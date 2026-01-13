"""東証銘柄リスト取得

東証上場の普通株全銘柄を取得する。
ETF/ETN/REIT/優先株は除外。
"""
import pandas as pd
from loguru import logger

# JPX（日本取引所グループ）の銘柄一覧CSV URL
# 実際のURLは変更される可能性があるため、取得元を切り替え可能に設計
JPX_LIST_URL = "https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xls"


def fetch_stock_list() -> pd.DataFrame:
    """
    東証銘柄リストを取得

    Returns:
        DataFrame: company_code, company_name, sector, market を含む
    """
    try:
        # JPXの銘柄一覧を取得
        df = pd.read_excel(JPX_LIST_URL)

        # カラム名を正規化（実際のカラム名に合わせて調整が必要）
        # 想定カラム: コード, 銘柄名, 市場・商品区分, 33業種区分
        df = df.rename(columns={
            "コード": "company_code",
            "銘柄名": "company_name",
            "市場・商品区分": "market",
            "33業種区分": "sector",
        })

        # 必要なカラムのみ抽出
        required_cols = ["company_code", "company_name", "market", "sector"]
        df = df[required_cols].copy()

        # company_codeを文字列に
        df["company_code"] = df["company_code"].astype(str)

        # 普通株のみフィルタ（ETF/REIT等を除外）
        # 市場区分が「プライム」「スタンダード」「グロース」のみ
        valid_markets = ["プライム（内国株式）", "スタンダード（内国株式）", "グロース（内国株式）"]
        df = df[df["market"].isin(valid_markets)]

        # 市場名を簡略化
        df["market"] = df["market"].str.replace("（内国株式）", "", regex=False)

        logger.info(f"銘柄リスト取得完了: {len(df)}件")
        return df

    except Exception as e:
        logger.error(f"銘柄リスト取得失敗: {e}")
        raise


def fetch_stock_list_fallback() -> pd.DataFrame:
    """
    フォールバック: yfinanceから日本株を取得

    JPXのリストが取得できない場合の代替手段
    """
    # yfinanceでは直接リストを取得できないため、
    # 事前に保存したCSVを使用するか、別のソースを使用
    logger.warning("フォールバック: ローカルCSVから銘柄リストを読み込み")

    csv_path = "data/stock_list.csv"
    try:
        df = pd.read_csv(csv_path, dtype={"company_code": str})
        return df
    except FileNotFoundError:
        logger.error(f"フォールバックCSVが見つかりません: {csv_path}")
        raise


if __name__ == "__main__":
    # テスト実行
    from loguru import logger
    import sys
    logger.remove()
    logger.add(sys.stderr, level="DEBUG")

    df = fetch_stock_list()
    print(df.head(20))
    print(f"\n市場別件数:\n{df['market'].value_counts()}")
    print(f"\nセクター別件数:\n{df['sector'].value_counts()}")
