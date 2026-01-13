"use client";

import { useState } from "react";
import Link from "next/link";

type RegisterResult = {
  success: string[];
  failed: { code: string; reason: string }[];
  duplicate: string[];
};

export default function RegisterPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // 入力をパース（改行/カンマ/スペース区切り）
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary-900">銘柄登録</h1>
        <p className="text-sm text-primary-600 mt-1">
          スクリーニング対象の銘柄を登録します
        </p>
      </div>

      {/* 登録フォーム */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
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
            {loading ? "登録中..." : "登録"}
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
