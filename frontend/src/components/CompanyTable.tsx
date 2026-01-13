"use client";

import Link from "next/link";
import type { ScreenedCompany } from "@/lib/supabase";
import {
  formatNumber,
  formatPercent,
  formatOku,
  formatMultiple,
  formatDateTime,
  getValueClass,
  getStatusBadgeClass,
  getStatusLabel,
} from "@/lib/format";

type Props = {
  companies: ScreenedCompany[];
};

export function CompanyTable({ companies }: Props) {
  if (companies.length === 0) {
    return (
      <div className="rounded-lg border border-primary-200 bg-white p-8 text-center text-primary-500">
        該当する企業がありません
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-primary-100">コード</th>
            <th>会社名</th>
            <th>セクター</th>
            <th className="text-right">時価総額</th>
            <th className="text-right">売上成長</th>
            <th className="text-right">営利成長</th>
            <th className="text-right">営利率</th>
            <th className="text-right">ROA</th>
            <th className="text-right">自己資本比率</th>
            <th className="text-right">PER</th>
            <th className="text-right">PBR</th>
            <th className="text-right">配当利回り</th>
            <th>更新</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.company_code}>
              <td className="sticky left-0 z-10 bg-white font-mono">
                <Link
                  href={`/companies/${company.company_code}`}
                  className="text-primary-700 hover:text-primary-900 hover:underline"
                >
                  {company.company_code}
                </Link>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/companies/${company.company_code}`}
                    className="font-medium hover:underline"
                  >
                    {company.company_name}
                  </Link>
                  <span className={getStatusBadgeClass(company.status)}>
                    {getStatusLabel(company.status)}
                  </span>
                  {company.data_status === "stale" && (
                    <span className="badge badge-stale">更新遅延</span>
                  )}
                </div>
              </td>
              <td className="text-sm text-primary-600">{company.sector || "—"}</td>
              <td className="text-right font-numeric">
                {formatOku(company.market_cap)}
              </td>
              <td className={`text-right font-numeric ${getValueClass(company.revenue_growth_1y_cy)}`}>
                {formatPercent(company.revenue_growth_1y_cy)}
              </td>
              <td className={`text-right font-numeric ${getValueClass(company.op_growth_1y_cy)}`}>
                {formatPercent(company.op_growth_1y_cy)}
              </td>
              <td className="text-right font-numeric">
                {formatNumber(company.operating_margin)}%
              </td>
              <td className="text-right font-numeric">
                {formatNumber(company.roa)}%
              </td>
              <td className="text-right font-numeric">
                {formatNumber(company.equity_ratio)}%
              </td>
              <td className="text-right font-numeric">
                {formatMultiple(company.per_forward)}
              </td>
              <td className="text-right font-numeric">
                {formatMultiple(company.pbr)}
              </td>
              <td className="text-right font-numeric">
                {company.dividend_yield !== null
                  ? `${formatNumber(company.dividend_yield)}%`
                  : "—"}
              </td>
              <td className="text-xs text-primary-500">
                {formatDateTime(company.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
