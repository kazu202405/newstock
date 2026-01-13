"use client";

import { useState } from "react";
import Link from "next/link";

type StockInfo = {
  code: string;
  name: string;
  market: string;
  sector: string;
  price: number | null;
  marketCap: number | null;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
};

type RegisterResult = {
  success: string[];
  failed: { code: string; reason: string }[];
  duplicate: string[];
};

export default function RegisterPage() {
  // 検索関連
  const [searchCode, setSearchCode] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<StockInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 一括登録関連
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 銘柄検索
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setSearchLoading(true);
    setSearchResult(null);
    setSearchError(null);

    try {
      const response = await fetch(`/api/stocks/search?code=${searchCode.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        setSearchError(data.error || "検索に失敗しました");
      } else {
        setSearchResult(data.stock);
      }
    } catch (err) {
      setSearchError("通信エラーが発生しました");
    } finally {
      setSearchLoading(false);
    }
  };

  // 検索結果から登録
  const handleQuickRegister = async (code: string) => {
    setSearchLoading(true);
    try {
      const response = await fetch("/api/companies/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: [code] }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSearchError(data.error || "登録に失敗しました");
      } else if (data.results.success.length > 0) {
        setSearchError(null);
        setSearchResult(null);
        setSearchCode("");
        alert(`${code} を登録しました`);
      } else if (data.results.duplicate.length > 0) {
        setSearchError("この銘柄は既に登録済みです");
      } else if (data.results.failed.length > 0) {
        setSearchError(data.results.failed[0].reason);
      }
    } catch (err) {
      setSearchError("通信エラーが発生しました");
    } finally {
      setSearchLoading(false);
    }
  };

  // 一括登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const codes = input
        .split(/[\n,\s]+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (codes.length === 0) {
        setError("銘柄コードを入力してください");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/companies/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "登録に失敗しました");
      } else {
        setResult(data.results);
        if (data.results.success.length > 0) {
          setInput("");
        }
      }
    } catch (err) {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 数値フォーマット
  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return `¥${price.toLocaleString()}`;
  };

  const formatMarketCap = (cap: number | null) => {
    if (cap === null) return "—";
    if (cap >= 10000) return `${(cap / 10000).toFixed(1)}兆円`;
    return `${cap.toFixed(0)}億円`;
  };

  const formatNumber = (num: number | null, suffix: string = "") => {
    if (num === null) return "—";
    return `${num.toFixed(2)}${suffix}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary-900">銘柄登録</h1>
        <p className="text-sm text-primary-600 mt-1">
          スクリーニング対象の銘柄を登録します
        </p>
      </div>

      {/* 銘柄検索セクション */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">
          銘柄検索
        </h2>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="証券コード（例: 7203）"
            maxLength={4}
            className="w-40 rounded border border-primary-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={searchLoading || !searchCode.trim()}
            className="rounded bg-primary-700 px-4 py-2 text-sm text-white hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searchLoading ? "検索中..." : "検索"}
          </button>
        </form>

        {/* 検索エラー */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{searchError}</p>
          </div>
        )}

        {/* 検索結果 */}
        {searchResult && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-primary-600">
                    {searchResult.code}
                  </span>
                  <span className="text-xs bg-primary-200 text-primary-700 px-2 py-0.5 rounded">
                    {searchResult.market}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-primary-900">
                  {searchResult.name}
                </h3>
                <p className="text-sm text-primary-600 mt-1">
                  {searchResult.sector}
                </p>

                {/* 指標 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div>
                    <div className="text-xs text-primary-500">株価</div>
                    <div className="font-numeric">
                      {formatPrice(searchResult.price)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-primary-500">時価総額</div>
                    <div className="font-numeric">
                      {formatMarketCap(searchResult.marketCap)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-primary-500">PER</div>
                    <div className="font-numeric">
                      {formatNumber(searchResult.per, "倍")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-primary-500">PBR</div>
                    <div className="font-numeric">
                      {formatNumber(searchResult.pbr, "倍")}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleQuickRegister(searchResult.code)}
                disabled={searchLoading}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                登録する
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 一括登録フォーム */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">
          一括登録
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="codes"
              className="block text-sm font-medium text-primary-700 mb-2"
            >
              証券コード（複数可）
            </label>
            <textarea
              id="codes"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="7203&#10;6758&#10;9984&#10;&#10;または: 7203, 6758, 9984"
              rows={6}
              className="w-full rounded border border-primary-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <p className="text-xs text-primary-500 mt-1">
              改行、カンマ、スペースで区切って複数の銘柄を一括登録できます
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded bg-primary-700 px-4 py-2 text-sm text-white hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "登録中..." : "一括登録"}
          </button>
        </form>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            登録結果
          </h2>

          {/* 成功 */}
          {result.success.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                登録成功（{result.success.length}件）
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.success.map((code) => (
                  <span
                    key={code}
                    className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-mono text-green-800"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 重複 */}
          {result.duplicate.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-amber-800 mb-2">
                既に登録済み（{result.duplicate.length}件）
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.duplicate.map((code) => (
                  <span
                    key={code}
                    className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-mono text-amber-800"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 失敗 */}
          {result.failed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-2">
                登録失敗（{result.failed.length}件）
              </h3>
              <ul className="space-y-1 text-sm text-red-700">
                {result.failed.map((item) => (
                  <li key={item.code} className="flex gap-2">
                    <span className="font-mono">{item.code}</span>
                    <span>- {item.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.success.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary-100">
              <p className="text-sm text-primary-600">
                登録した銘柄はバッチ処理後に一覧に表示されます。
              </p>
              <Link
                href="/"
                className="inline-block mt-2 text-sm text-primary-700 hover:text-primary-900 hover:underline"
              >
                一覧へ戻る →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 説明 */}
      <div className="bg-primary-50 rounded-lg p-4 text-sm text-primary-700">
        <h3 className="font-medium mb-2">銘柄登録について</h3>
        <ul className="space-y-1 list-disc list-inside">
          <li>4桁の証券コードを入力してください（例: 7203）</li>
          <li>
            登録された銘柄は、定期バッチ実行後にスクリーニング結果が表示されます
          </li>
          <li>
            バッチは月・木曜日 06:10（財務更新）、平日 12:10/16:10（株価更新）に実行されます
          </li>
          <li>東証上場の普通株のみ対象です（ETF/REIT等は除外）</li>
        </ul>
      </div>
    </div>
  );
}
