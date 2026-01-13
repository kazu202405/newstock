import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase, type ScreenedCompany } from "@/lib/supabase";
import {
  formatNumber,
  formatPercent,
  formatOku,
  formatMultiple,
  formatDateTime,
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

// スクリーニング条件
const CONDITIONS = [
  { field: "tk_deviation_revenue", name: "TK会社乖離(売上高)", op: ">", value: 0, unit: "%" },
  { field: "tk_deviation_op", name: "TK会社乖離(営業利益)", op: ">", value: 0, unit: "%" },
  { field: "market_cap", name: "時価総額", op: "<=", value: 700, unit: "億円" },
  { field: "equity_ratio", name: "自己資本比率(前期)", op: ">=", value: 30, unit: "%" },
  { field: "revenue_growth_2y_1y", name: "売上高増減率(2期前→前期)", op: ">", value: 0, unit: "%" },
  { field: "revenue_growth_1y_cy", name: "売上高増減率(前期→今期予)", op: ">", value: 0, unit: "%" },
  { field: "revenue_growth_cy_ny", name: "売上高増減率(今期予→来期予)", op: ">", value: 0, unit: "%" },
  { field: "operating_margin", name: "売上高営業利益率(前期)", op: ">=", value: 10, unit: "%" },
  { field: "op_growth_2y_1y", name: "営業利益増減率(2期前→前期)", op: ">", value: 0, unit: "%" },
  { field: "op_growth_1y_cy", name: "営業利益増減率(前期→今期予)", op: ">", value: 0, unit: "%" },
  { field: "op_growth_cy_ny", name: "営業利益増減率(今期予→来期予)", op: ">", value: 0, unit: "%" },
  { field: "operating_cf", name: "営業CF(前期)", op: ">", value: 0, unit: "億円" },
  { field: "free_cf", name: "フリーCF(前期)", op: ">", value: 0, unit: "億円" },
  { field: "listing_date", name: "上場年月", op: ">", value: "2012-12-01", unit: "" },
  { field: "roa", name: "ROA(前期)", op: ">", value: 4.5, unit: "%" },
  { field: "per_forward", name: "PER(来期)", op: "<", value: 40, unit: "倍" },
  { field: "pbr", name: "PBR(直近Q)", op: "<", value: 10, unit: "倍" },
];

async function getCompany(code: string): Promise<ScreenedCompany | null> {
  // 登録銘柄かチェック
  const { data: watched } = await supabase
    .from("watched_tickers")
    .select("company_code")
    .eq("company_code", code)
    .single();

  if (!watched) {
    return null;
  }

  const { data, error } = await supabase
    .from("screened_latest")
    .select("*")
    .eq("company_code", code)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ScreenedCompany;
}

function checkCondition(
  value: number | string | null,
  op: string,
  threshold: number | string
): "ok" | "ng" | "review" {
  if (value === null || value === undefined) {
    return "review";
  }

  // 日付比較
  if (typeof threshold === "string" && threshold.includes("-")) {
    const valueDate = new Date(value as string);
    const thresholdDate = new Date(threshold);
    if (isNaN(valueDate.getTime())) return "review";
    if (op === ">") return valueDate > thresholdDate ? "ok" : "ng";
    return "review";
  }

  const numValue = Number(value);
  const numThreshold = Number(threshold);

  if (isNaN(numValue)) return "review";

  switch (op) {
    case ">":
      return numValue > numThreshold ? "ok" : "ng";
    case ">=":
      return numValue >= numThreshold ? "ok" : "ng";
    case "<":
      return numValue < numThreshold ? "ok" : "ng";
    case "<=":
      return numValue <= numThreshold ? "ok" : "ng";
    default:
      return "review";
  }
}

function formatValue(value: number | string | null, unit: string): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (unit === "" && typeof value === "string") {
    return formatDate(value);
  }

  const numValue = Number(value);
  if (isNaN(numValue)) return "—";

  if (unit === "億円") {
    return formatOku(numValue);
  }
  if (unit === "倍") {
    return formatMultiple(numValue);
  }
  if (unit === "%") {
    return `${formatNumber(numValue)}%`;
  }

  return formatNumber(numValue);
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const company = await getCompany(code);

  if (!company) {
    notFound();
  }

  // レビュー理由のマップを作成
  const reviewReasonMap = new Map<string, string>();
  if (company.review_reasons) {
    for (const reason of company.review_reasons) {
      if (reason.field) {
        reviewReasonMap.set(reason.field, reason.message);
      }
    }
  }

  return (
    <div>
      {/* パンくず */}
      <nav className="text-sm text-primary-500 mb-4">
        <Link href="/" className="hover:text-primary-700">
          一覧
        </Link>
        <span className="mx-2">›</span>
        <span className="text-primary-800">{company.company_code}</span>
      </nav>

      {/* ヘッダー */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-primary-500">
                {company.company_code}
              </span>
              <span className={getStatusBadgeClass(company.status)}>
                {getStatusLabel(company.status)}
              </span>
              {company.data_status === "stale" && (
                <span className="badge badge-stale">更新遅延</span>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-primary-900">
              {company.company_name}
            </h1>
            <div className="text-sm text-primary-600 mt-1">
              {company.market || "—"} / {company.sector || "—"}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-primary-500">時価総額</div>
            <div className="text-2xl font-numeric font-semibold">
              {formatOku(company.market_cap)}
            </div>
            {company.stock_price && (
              <div className="text-sm text-primary-600 mt-1">
                株価: ¥{company.stock_price.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* 主要指標サマリ */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-primary-100">
          <div>
            <div className="text-xs text-primary-500">ROA</div>
            <div className="font-numeric text-lg">{formatNumber(company.roa)}%</div>
          </div>
          <div>
            <div className="text-xs text-primary-500">営業利益率</div>
            <div className="font-numeric text-lg">
              {formatNumber(company.operating_margin)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">自己資本比率</div>
            <div className="font-numeric text-lg">
              {formatNumber(company.equity_ratio)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">PER(来期)</div>
            <div className="font-numeric text-lg">
              {formatMultiple(company.per_forward)}
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">PBR</div>
            <div className="font-numeric text-lg">{formatMultiple(company.pbr)}</div>
          </div>
          <div>
            <div className="text-xs text-primary-500">配当利回り</div>
            <div className="font-numeric text-lg">
              {company.dividend_yield !== null
                ? `${formatNumber(company.dividend_yield)}%`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* 成長指標 */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">成長指標</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-primary-500">売上成長(前期→今期予)</div>
            <div className="font-numeric text-lg">
              {formatPercent(company.revenue_growth_1y_cy)}
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">営利成長(前期→今期予)</div>
            <div className="font-numeric text-lg">
              {formatPercent(company.op_growth_1y_cy)}
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">営業CF(前期)</div>
            <div className="font-numeric text-lg">
              {formatOku(company.operating_cf)}
            </div>
          </div>
          <div>
            <div className="text-xs text-primary-500">フリーCF(前期)</div>
            <div className="font-numeric text-lg">
              {formatOku(company.free_cf)}
            </div>
          </div>
        </div>
      </div>

      {/* 条件チェックリスト */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">
          条件チェックリスト
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-200">
                <th className="text-left py-2 pr-4">項目</th>
                <th className="text-right py-2 px-4">値</th>
                <th className="text-center py-2 px-4">基準</th>
                <th className="text-center py-2 pl-4">判定</th>
              </tr>
            </thead>
            <tbody>
              {CONDITIONS.map((cond) => {
                const rawValue = company[cond.field as keyof ScreenedCompany];
                const value = typeof rawValue === "number" || typeof rawValue === "string" ? rawValue : null;
                const result = checkCondition(value, cond.op, cond.value);
                const reviewReason = reviewReasonMap.get(cond.field);

                return (
                  <tr key={cond.field} className="border-b border-primary-100">
                    <td className="py-3 pr-4">{cond.name}</td>
                    <td className="py-3 px-4 text-right font-numeric">
                      {result === "review" && reviewReason ? (
                        <span className="text-primary-400">{reviewReason}</span>
                      ) : (
                        formatValue(value, cond.unit)
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-primary-500">
                      {cond.op} {cond.value}
                      {cond.unit}
                    </td>
                    <td className="py-3 pl-4 text-center">
                      {result === "ok" && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700">
                          ○
                        </span>
                      )}
                      {result === "ng" && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700">
                          ×
                        </span>
                      )}
                      {result === "review" && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700">
                          ?
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 判定理由（REVIEW/FAILの場合） */}
      {(company.review_reasons?.length > 0 || company.failed_reasons?.length > 0) && (
        <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary-900 mb-4">判定理由</h2>

          {company.review_reasons?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-amber-800 mb-2">要確認事項</h3>
              <ul className="space-y-1 text-sm text-amber-700">
                {company.review_reasons.map((reason, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{reason.name || reason.field}: {reason.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {company.failed_reasons?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-2">条件未達事項</h3>
              <ul className="space-y-1 text-sm text-red-700">
                {company.failed_reasons.map((reason, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{reason.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 更新情報 */}
      <div className="bg-primary-50 rounded-lg p-4 text-sm text-primary-600">
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="font-medium">財務更新:</span>{" "}
            {formatDateTime(company.updated_at)}
          </div>
          {company.price_updated_at && (
            <div>
              <span className="font-medium">株価更新:</span>{" "}
              {formatDateTime(company.price_updated_at)}
            </div>
          )}
          <div>
            <span className="font-medium">上場日:</span>{" "}
            {formatDate(company.listing_date)}
          </div>
          <div>
            <span className="font-medium">データソース:</span>{" "}
            {company.data_source || "yfinance"}
          </div>
        </div>
      </div>
    </div>
  );
}
