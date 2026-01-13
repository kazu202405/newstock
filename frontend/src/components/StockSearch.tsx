"use client";

import { useState } from "react";

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

export function StockSearch() {
  const [searchCode, setSearchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // 銘柄検索
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setRegisterSuccess(false);

    try {
      const response = await fetch(`/api/stocks/search?code=${searchCode.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "検索に失敗しました");
      } else {
        setResult(data.stock);
      }
    } catch (err) {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 登録
  const handleRegister = async (code: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/companies/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: [code] }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "登録に失敗しました");
      } else if (data.results.success.length > 0) {
        setRegisterSuccess(true);
        setError(null);
      } else if (data.results.duplicate.length > 0) {
        setError("この銘柄は既に登録済みです");
      } else if (data.results.failed.length > 0) {
        setError(data.results.failed[0].reason);
      }
    } catch (err) {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // フォーマット
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
    <div className="bg-white rounded-lg border border-primary-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-primary-900">銘柄検索</h2>
        <span className="text-xs text-primary-500">証券コードで検索して登録</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          placeholder="証券コード（例: 7203）"
          maxLength={4}
          className="w-36 rounded border border-primary-300 px-3 py-1.5 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={loading || !searchCode.trim()}
          className="rounded bg-primary-700 px-3 py-1.5 text-sm text-white hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "検索"}
        </button>
      </form>

      {/* エラー */}
      {error && (
        <div className="mt-3 text-sm text-red-600">{error}</div>
      )}

      {/* 検索結果 */}
      {result && (
        <div className="mt-3 bg-primary-50 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-primary-600">{result.code}</span>
                <span className="text-xs bg-primary-200 text-primary-700 px-1.5 py-0.5 rounded">
                  {result.market}
                </span>
              </div>
              <h3 className="font-semibold text-primary-900 truncate">{result.name}</h3>
              <p className="text-xs text-primary-500">{result.sector}</p>

              <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                <div>
                  <div className="text-primary-400">株価</div>
                  <div className="font-numeric">{formatPrice(result.price)}</div>
                </div>
                <div>
                  <div className="text-primary-400">時価総額</div>
                  <div className="font-numeric">{formatMarketCap(result.marketCap)}</div>
                </div>
                <div>
                  <div className="text-primary-400">PER</div>
                  <div className="font-numeric">{formatNumber(result.per, "倍")}</div>
                </div>
                <div>
                  <div className="text-primary-400">PBR</div>
                  <div className="font-numeric">{formatNumber(result.pbr, "倍")}</div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              {registerSuccess ? (
                <span className="text-xs text-green-600 font-medium">登録済み ✓</span>
              ) : (
                <button
                  onClick={() => handleRegister(result.code)}
                  disabled={loading}
                  className="rounded bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                >
                  登録
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
