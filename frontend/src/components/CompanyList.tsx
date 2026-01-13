"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import type { ScreenedCompany } from "@/lib/supabase";
import { CompanyTable } from "./CompanyTable";
import { CompanyCard } from "./CompanyCard";

type Props = {
  companies: ScreenedCompany[];
  total: number;
  sectors: string[];
  currentStatus: string;
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
};

export function CompanyList({
  companies,
  total,
  sectors,
  currentStatus,
  currentPage,
  totalPages,
  searchParams,
}: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.q || "");

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams();

      // 既存のパラメータを保持
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value && key !== "page") {
          params.set(key, value);
        }
      });

      // 更新を適用
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchQuery || null, page: null });
  };

  const handleStatusChange = (status: string) => {
    updateParams({ status, page: null });
  };

  const handleSectorChange = (sector: string) => {
    updateParams({ sector: sector || null, page: null });
  };

  const handleSortChange = (sort: string) => {
    updateParams({ sort: sort || null, page: null });
  };

  const handlePageChange = (page: number) => {
    updateParams({ page: page.toString() });
  };

  return (
    <div>
      {/* タブ */}
      <div className="flex border-b border-primary-200 mb-4">
        <button
          onClick={() => handleStatusChange("PASS")}
          className={`tab ${currentStatus === "PASS" ? "tab-active" : "tab-inactive"}`}
        >
          条件合致 ({currentStatus === "PASS" ? total : "—"})
        </button>
        <button
          onClick={() => handleStatusChange("REVIEW")}
          className={`tab ${currentStatus === "REVIEW" ? "tab-active" : "tab-inactive"}`}
        >
          要確認 ({currentStatus === "REVIEW" ? total : "—"})
        </button>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* 検索 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="会社名・コードで検索"
            className="rounded border border-primary-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-primary-700 px-3 py-1.5 text-sm text-white hover:bg-primary-800"
          >
            検索
          </button>
        </form>

        {/* セクターフィルター */}
        <select
          value={searchParams.sector || ""}
          onChange={(e) => handleSectorChange(e.target.value)}
          className="rounded border border-primary-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">全セクター</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>

        {/* ソート */}
        <select
          value={searchParams.sort || "market_cap"}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded border border-primary-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="market_cap">時価総額（大きい順）</option>
          <option value="-market_cap">時価総額（小さい順）</option>
          <option value="-roa">ROA（高い順）</option>
          <option value="-revenue_growth_1y_cy">売上成長（高い順）</option>
          <option value="-dividend_yield">配当利回り（高い順）</option>
        </select>
      </div>

      {/* 件数表示 */}
      <div className="text-sm text-primary-600 mb-4">
        {total}件中 {(currentPage - 1) * 50 + 1}〜
        {Math.min(currentPage * 50, total)}件を表示
      </div>

      {/* PC: テーブル表示 */}
      <div className="hidden lg:block">
        <CompanyTable companies={companies} />
      </div>

      {/* モバイル: カード表示 */}
      <div className="lg:hidden space-y-3">
        {companies.map((company) => (
          <CompanyCard key={company.company_code} company={company} />
        ))}
        {companies.length === 0 && (
          <div className="rounded-lg border border-primary-200 bg-white p-8 text-center text-primary-500">
            該当する企業がありません
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded border border-primary-300 px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-100"
          >
            前へ
          </button>

          {/* ページ番号 */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  pageNum === currentPage
                    ? "border-primary-700 bg-primary-700 text-white"
                    : "border-primary-300 hover:bg-primary-100"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded border border-primary-300 px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-100"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
