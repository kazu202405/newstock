"""
バッチ処理メインエントリポイント

使用方法:
    python main.py --mode financial   # 財務・指標・判定更新（月木06:10）
    python main.py --mode price       # 株価・時価総額更新（平日12:10/16:10）
    python main.py --mode full        # フル更新（初回実行時）
    python main.py --mode test        # テスト（少数銘柄で動作確認）
"""
import argparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from loguru import logger
import sys

from config import BATCH_CONCURRENCY
from db import (
    get_watched_tickers,
    upsert_companies,
    get_all_codes,
    update_price,
    mark_stale,
)
from fetcher import fetch_stock_list, fetch_financial_data, fetch_price_data
from fetcher.price import fetch_price_batch
from screener import judge_company, judge_all


def setup_logger():
    """ロガー設定"""
    logger.remove()
    logger.add(
        sys.stderr,
        level="INFO",
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>"
    )
    logger.add(
        "logs/batch_{time:YYYY-MM-DD}.log",
        rotation="1 day",
        retention="30 days",
        level="DEBUG"
    )


def run_financial_update():
    """
    財務・指標・判定更新（メインバッチ）

    1. 登録銘柄リスト取得（watched_tickers）
    2. 各銘柄の財務データ取得（並列）
    3. スクリーニング判定
    4. DB更新
    """
    logger.info("=== 財務更新バッチ開始 ===")
    start_time = datetime.now()

    # 1. 登録銘柄リスト取得
    logger.info("登録銘柄リスト取得中...")
    codes = get_watched_tickers()

    if not codes:
        logger.warning("登録銘柄がありません。銘柄を登録してください。")
        return

    logger.info(f"対象銘柄数: {len(codes)}")

    # 市場・セクター情報取得（JPXリストから）
    try:
        stock_df = fetch_stock_list()
        market_map = dict(zip(stock_df["company_code"].astype(str), stock_df["market"]))
        sector_map = dict(zip(stock_df["company_code"].astype(str), stock_df["sector"]))
    except Exception as e:
        logger.warning(f"銘柄マスタ取得失敗、空のマップを使用: {e}")
        market_map = {}
        sector_map = {}

    # 2. 財務データ取得（並列実行）
    logger.info(f"財務データ取得中... (並列数: {BATCH_CONCURRENCY})")
    financial_data = []
    failed_codes = []

    with ThreadPoolExecutor(max_workers=BATCH_CONCURRENCY) as executor:
        future_to_code = {executor.submit(fetch_financial_data, code): code for code in codes}

        for future in as_completed(future_to_code):
            code = future_to_code[future]
            try:
                data = future.result()
                # 市場・セクター情報を追加
                data["market"] = market_map.get(code, data.get("market", ""))
                data["sector"] = sector_map.get(code, data.get("sector", ""))
                financial_data.append(data)
            except Exception as e:
                logger.error(f"財務取得例外 {code}: {e}")
                failed_codes.append(code)

    logger.info(f"財務データ取得完了: {len(financial_data)}件, 失敗: {len(failed_codes)}件")

    # 失敗した銘柄をstaleにマーク
    if failed_codes:
        mark_stale(failed_codes, "FETCH_FAILED")

    # 3. スクリーニング判定
    logger.info("スクリーニング判定中...")
    judged_data = judge_all(financial_data)

    # 4. DB更新
    logger.info("DB更新中...")
    upsert_count = upsert_companies(judged_data)

    # 完了
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"=== 財務更新バッチ完了 === (所要時間: {elapsed:.1f}秒)")

    # サマリー
    pass_count = sum(1 for d in judged_data if d.get("status") == "PASS")
    fail_count = sum(1 for d in judged_data if d.get("status") == "FAIL")
    review_count = sum(1 for d in judged_data if d.get("status") == "REVIEW")
    logger.info(f"結果: PASS={pass_count}, FAIL={fail_count}, REVIEW={review_count}")


def run_price_update():
    """
    株価・時価総額更新（軽量バッチ）

    登録銘柄の株価のみ更新
    """
    logger.info("=== 株価更新バッチ開始 ===")
    start_time = datetime.now()

    # 登録銘柄コード取得
    codes = get_watched_tickers()
    if not codes:
        logger.warning("更新対象銘柄なし")
        return

    logger.info(f"対象銘柄数: {len(codes)}")

    # バッチ取得（100件ずつ）
    batch_size = 100
    updated_count = 0
    failed_codes = []

    for i in range(0, len(codes), batch_size):
        batch_codes = codes[i:i + batch_size]
        price_data = fetch_price_batch(batch_codes)

        for data in price_data:
            if data.get("stock_price") is not None:
                if update_price(data["company_code"], data):
                    updated_count += 1
            else:
                failed_codes.append(data["company_code"])

    # 失敗した銘柄をstaleにマーク
    if failed_codes:
        mark_stale(failed_codes, "PRICE_FETCH_FAILED")

    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"=== 株価更新バッチ完了 === 更新: {updated_count}件, 失敗: {len(failed_codes)}件 (所要時間: {elapsed:.1f}秒)")


def run_test():
    """
    テスト実行（少数銘柄で動作確認）
    """
    logger.info("=== テストモード ===")

    # テスト銘柄（トヨタ、ソニー、任天堂）
    test_codes = ["7203", "6758", "7974"]

    logger.info("財務データ取得テスト...")
    for code in test_codes:
        data = fetch_financial_data(code)
        judged = judge_company(data)
        logger.info(f"{code} {judged.get('company_name', 'N/A')}: {judged.get('status')}")

        if judged.get("status") == "FAIL":
            for reason in judged.get("failed_reasons", []):
                logger.info(f"  NG: {reason.get('message', '')}")
        elif judged.get("status") == "REVIEW":
            for reason in judged.get("review_reasons", []):
                logger.info(f"  要確認: {reason.get('message', '')}")

    logger.info("\n株価取得テスト...")
    for code in test_codes:
        price = fetch_price_data(code)
        if price.get("stock_price"):
            logger.info(f"{code}: ¥{price.get('stock_price')} / 時価総額 {price.get('market_cap', 0):.1f}億円")
        else:
            logger.warning(f"{code}: 株価取得失敗")

    logger.info("=== テスト完了 ===")


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description="株式スクリーニングバッチ")
    parser.add_argument(
        "--mode",
        choices=["financial", "price", "full", "test"],
        default="test",
        help="実行モード: financial=財務更新, price=株価更新, full=フル更新, test=テスト"
    )
    args = parser.parse_args()

    setup_logger()

    if args.mode == "financial":
        run_financial_update()
    elif args.mode == "price":
        run_price_update()
    elif args.mode == "full":
        run_financial_update()
        run_price_update()
    elif args.mode == "test":
        run_test()


if __name__ == "__main__":
    main()
