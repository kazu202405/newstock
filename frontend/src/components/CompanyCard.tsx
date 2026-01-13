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
  company: ScreenedCompany;
};

export function CompanyCard({ company }: Props) {
  return (
    <Link href={`/companies/${company.company_code}`} className="block">
      <div className="company-card hover:border-primary-300 transition-colors">
        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-primary-500">
                {company.company_code}
              </span>
              <span className={getStatusBadgeClass(company.status)}>
                {getStatusLabel(company.status)}
              </span>
              {company.data_status === "stale" && (
                <span className="badge badge-stale">更新遅延</span>
              )}
            </div>
            <h3 className="font-medium text-primary-900 mt-1">
              {company.company_name}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-xs text-primary-500">時価総額</div>
            <div className="font-numeric font-medium">
              {formatOku(company.market_cap)}
            </div>
          </div>
        </div>

        {/* セクター */}
        <div className="text-sm text-primary-600 mb-3">
          {company.sector || "—"}
        </div>

        {/* 指標グリッド */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-primary-500">ROA</div>
            <div className="font-numeric">{formatNumber(company.roa)}%</div>
          </div>
          <div>
            <div className="text-xs text-primary-500">営利率</div>
            <div className="font-numeric">
              {formatNumber(company.operating_margin)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">自己資本</div>
            <div className="font-numeric">
              {formatNumber(company.equity_ratio)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">売上成長</div>
            <div className={`font-numeric ${getValueClass(company.revenue_growth_1y_cy)}`}>
              {formatPercent(company.revenue_growth_1y_cy)}
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">営利成長</div>
            <div className={`font-numeric ${getValueClass(company.op_growth_1y_cy)}`}>
              {formatPercent(company.op_growth_1y_cy)}
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">配当</div>
            <div className="font-numeric">
              {company.dividend_yield !== null
                ? `${formatNumber(company.dividend_yield)}%`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">PER</div>
            <div className="font-numeric">{formatMultiple(company.per_forward)}</div>
          </div>
          <div>
            <div className="text-xs text-primary-500">PBR</div>
            <div className="font-numeric">{formatMultiple(company.pbr)}</div>
          </div>
        </div>

        {/* 更新日時 */}
        <div className="mt-3 pt-3 border-t border-primary-100 text-xs text-primary-400">
          更新: {formatDateTime(company.updated_at)}
        </div>
      </div>
    </Link>
  );
}
