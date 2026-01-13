"use client";

import { useState, useMemo } from "react";

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
  operatingMargin: number | null;
  roa: number | null;
  equityRatio: number | null;
  revenueGrowth: number | null;
  screening?: unknown; // APIから来るが使わない
};

type ScreeningCondition = {
  field: keyof StockInfo;
  name: string;
  op: ">" | ">=" | "<" | "<=";
  defaultValue: number;
  unit: string;
};

// デフォルトのスクリーニング条件
const DEFAULT_CONDITIONS: ScreeningCondition[] = [
  { field: "marketCap", name: "時価総額", op: "<=", defaultValue: 700, unit: "億円" },
  { field: "equityRatio", name: "自己資本比率", op: ">=", defaultValue: 30, unit: "%" },
  { field: "revenueGrowth", name: "売上成長率", op: ">", defaultValue: 0, unit: "%" },
  { field: "operatingMargin", name: "営業利益率", op: ">=", defaultValue: 10, unit: "%" },
  { field: "roa", name: "ROA", op: ">", defaultValue: 4.5, unit: "%" },
  { field: "per", name: "PER", op: "<", defaultValue: 40, unit: "倍" },
  { field: "pbr", name: "PBR", op: "<", defaultValue: 10, unit: "倍" },
];

export function StockSearch() {
  const [searchCode, setSearchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // ユーザー設定可能な条件値
  const [conditions, setConditions] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEFAULT_CONDITIONS.forEach((c) => {
      initial[c.field] = c.defaultValue;
    });
    return initial;
  });

  // 条件のON/OFF
  const [conditionEnabled, setConditionEnabled] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DEFAULT_CONDITIONS.forEach((c) => {
      initial[c.field] = true;
    });
    return initial;
  });

  // スクリーニング実行
  const screeningResults = useMemo(() => {
    if (!result) return null;

    const results = DEFAULT_CONDITIONS.map((cond) => {
      const value = result[cond.field] as number | null;
      const threshold = conditions[cond.field];
      const enabled = conditionEnabled[cond.field];

      if (!enabled) {
        return { ...cond, value, threshold, status: "skip" as const };
      }

      if (value === null || value === undefined || isNaN(value)) {
        return { ...cond, value, threshold, status: "unknown" as const };
      }

      let passed = false;
      switch (cond.op) {
        case ">":
          passed = value > threshold;
          break;
        case ">=":
          passed = value >= threshold;
          break;
        case "<":
          passed = value < threshold;
          break;
        case "<=":
          passed = value <= threshold;
          break;
      }

      return { ...cond, value, threshold, status: passed ? ("ok" as const) : ("ng" as const) };
    });

    const activeResults = results.filter((r) => r.status !== "skip");
    const passCount = activeResults.filter((r) => r.status === "ok").length;
    const failCount = activeResults.filter((r) => r.status === "ng").length;
    const unknownCount = activeResults.filter((r) => r.status === "unknown").length;

    return { results, passCount, failCount, unknownCount, total: activeResults.length };
  }, [result, conditions, conditionEnabled]);

  // 銘柄検索
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setRegisterSuccess(false);
    setShowDetails(false);

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

  // 条件値の更新
  const updateCondition = (field: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setConditions((prev) => ({ ...prev, [field]: num }));
    }
  };

  // 条件のON/OFF切り替え
  const toggleCondition = (field: string) => {
    setConditionEnabled((prev) => ({ ...prev, [field]: !prev[field] }));
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

  // スクリーニング結果のサマリー
  const getScreeningSummary = () => {
    if (!screeningResults) return null;
    const { passCount, failCount, unknownCount, total } = screeningResults;

    if (failCount > 0) {
      return {
        label: "条件未達",
        className: "bg-red-100 text-red-700",
        detail: `${passCount}/${total}項目クリア`,
      };
    }
    if (unknownCount > 0) {
      return {
        label: "要確認",
        className: "bg-amber-100 text-amber-700",
        detail: `${passCount}クリア / ${unknownCount}不明`,
      };
    }
    return {
      label: "条件合致",
      className: "bg-green-100 text-green-700",
      detail: `${passCount}/${total}項目クリア`,
    };
  };

  const summary = getScreeningSummary();

  return (
    <div className="bg-white rounded-lg border border-primary-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-primary-900">銘柄検索・スクリーニング</h2>
        <button
          onClick={() => setShowConditions(!showConditions)}
          className="text-xs text-primary-600 hover:text-primary-800"
        >
          {showConditions ? "条件を隠す ▲" : "条件を設定 ▼"}
        </button>
      </div>

      {/* スクリーニング条件設定 */}
      {showConditions && (
        <div className="mb-4 p-3 bg-primary-50 rounded-lg">
          <div className="text-xs text-primary-600 mb-2">スクリーニング条件（チェックで有効化）</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {DEFAULT_CONDITIONS.map((cond) => (
              <div key={cond.field} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id={`cond-${cond.field}`}
                  checked={conditionEnabled[cond.field]}
                  onChange={() => toggleCondition(cond.field)}
                  className="w-3 h-3"
                />
                <label
                  htmlFor={`cond-${cond.field}`}
                  className={`text-xs ${conditionEnabled[cond.field] ? "text-primary-700" : "text-primary-400"}`}
                >
                  {cond.name}
                </label>
                <span className="text-xs text-primary-400">{cond.op}</span>
                <input
                  type="number"
                  value={conditions[cond.field]}
                  onChange={(e) => updateCondition(cond.field, e.target.value)}
                  disabled={!conditionEnabled[cond.field]}
                  step={cond.unit === "%" ? "0.1" : "1"}
                  className="w-16 px-1 py-0.5 text-xs border border-primary-200 rounded disabled:bg-gray-100 disabled:text-gray-400"
                />
                <span className="text-xs text-primary-400">{cond.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 検索フォーム */}
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
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {/* 検索結果 */}
      {result && (
        <div className="mt-3 bg-primary-50 rounded-lg p-3">
          {/* 基本情報 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-primary-600">{result.code}</span>
                <span className="text-xs bg-primary-200 text-primary-700 px-1.5 py-0.5 rounded">
                  {result.market}
                </span>
                {summary && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${summary.className}`}>
                    {summary.label}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-primary-900 truncate">{result.name}</h3>
              <p className="text-xs text-primary-500">{result.sector}</p>

              {/* 指標グリッド */}
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

              <div className="grid grid-cols-4 gap-2 mt-1 text-xs">
                <div>
                  <div className="text-primary-400">営業利益率</div>
                  <div className="font-numeric">{formatNumber(result.operatingMargin, "%")}</div>
                </div>
                <div>
                  <div className="text-primary-400">ROA</div>
                  <div className="font-numeric">{formatNumber(result.roa, "%")}</div>
                </div>
                <div>
                  <div className="text-primary-400">自己資本比率</div>
                  <div className="font-numeric">{formatNumber(result.equityRatio, "%")}</div>
                </div>
                <div>
                  <div className="text-primary-400">売上成長</div>
                  <div className="font-numeric">{formatNumber(result.revenueGrowth, "%")}</div>
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

          {/* スクリーニング詳細 */}
          {screeningResults && (
            <div className="mt-3 pt-3 border-t border-primary-200">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1"
              >
                <span>{showDetails ? "▼" : "▶"}</span>
                <span>スクリーニング詳細 ({summary?.detail})</span>
              </button>

              {showDetails && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {screeningResults.results
                    .filter((r) => r.status !== "skip")
                    .map((r) => (
                      <div key={r.field} className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] ${
                            r.status === "ok"
                              ? "bg-green-100 text-green-700"
                              : r.status === "ng"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {r.status === "ok" ? "○" : r.status === "ng" ? "×" : "?"}
                        </span>
                        <span className="text-primary-600">{r.name}</span>
                        <span className="text-primary-400">
                          {r.value !== null ? r.value.toFixed(1) : "—"} ({r.op} {r.threshold}
                          {r.unit})
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
