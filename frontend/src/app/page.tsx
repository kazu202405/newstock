import { Suspense } from "react";
import { supabase, type ScreenedCompany } from "@/lib/supabase";
import { CompanyList } from "@/components/CompanyList";

// 動的レンダリングを強制（キャッシュなし）
export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  q?: string;
  sector?: string;
  minCap?: string;
  maxCap?: string;
  sort?: string;
  order?: string;
  page?: string;
};

const PAGE_SIZE = 50;

async function getCompanies(searchParams: SearchParams) {
  const status = searchParams.status || "PASS";
  const query = searchParams.q || "";
  const sector = searchParams.sector || "";
  const minCap = searchParams.minCap ? parseFloat(searchParams.minCap) : null;
  const maxCap = searchParams.maxCap ? parseFloat(searchParams.maxCap) : null;
  const sort = searchParams.sort || "roa";
  const order = searchParams.order || "desc";
  const page = parseInt(searchParams.page || "1", 10);

  // 登録銘柄コードを取得
  const { data: watchedTickers, error: watchedError } = await supabase
    .from("watched_tickers")
    .select("company_code");

  if (watchedError) {
    console.error("watched_tickers取得エラー:", watchedError);
    return { companies: [], total: 0, sectors: [], watchedCount: 0 };
  }

  const watchedCodes = watchedTickers?.map((t) => t.company_code) || [];

  // 登録銘柄がない場合
  if (watchedCodes.length === 0) {
    return { companies: [], total: 0, sectors: [], watchedCount: 0 };
  }

  // クエリ構築（登録銘柄のみ対象）
  let supaQuery = supabase
    .from("screened_latest")
    .select("*", { count: "exact" })
    .in("company_code", watchedCodes)
    .eq("status", status);

  // 検索フィルタ
  if (query) {
    supaQuery = supaQuery.or(
      `company_name.ilike.%${query}%,company_code.ilike.%${query}%`
    );
  }

  // セクターフィルタ
  if (sector) {
    supaQuery = supaQuery.eq("sector", sector);
  }

  // 時価総額フィルタ
  if (minCap !== null) {
    supaQuery = supaQuery.gte("market_cap", minCap);
  }
  if (maxCap !== null) {
    supaQuery = supaQuery.lte("market_cap", maxCap);
  }

  // ソート
  const ascending = order === "asc";
  supaQuery = supaQuery.order(sort, { ascending, nullsFirst: false });

  // ページング
  const offset = (page - 1) * PAGE_SIZE;
  supaQuery = supaQuery.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await supaQuery;

  if (error) {
    console.error("データ取得エラー:", error);
    return { companies: [], total: 0, sectors: [], watchedCount: watchedCodes.length };
  }

  // セクター一覧を取得（登録銘柄のみ）
  const { data: sectorData } = await supabase
    .from("screened_latest")
    .select("sector")
    .in("company_code", watchedCodes)
    .not("sector", "is", null);

  const sectors = [
    ...new Set(sectorData?.map((s) => s.sector).filter(Boolean) || []),
  ].sort();

  return {
    companies: (data as ScreenedCompany[]) || [],
    total: count || 0,
    sectors,
    watchedCount: watchedCodes.length,
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { companies, total, sectors, watchedCount } = await getCompanies(params);

  const status = params.status || "PASS";
  const currentPage = parseInt(params.page || "1", 10);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* ページタイトル */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary-900">
          スクリーニング結果
        </h1>
        <p className="text-sm text-primary-600 mt-1">
          登録銘柄のスクリーニング一覧（{watchedCount}銘柄登録中）
        </p>
      </div>

      {watchedCount === 0 ? (
        <div className="rounded-lg border border-primary-200 bg-white p-8 text-center">
          <p className="text-primary-600 mb-4">
            銘柄が登録されていません。
          </p>
          <a
            href="/admin/register"
            className="inline-block rounded bg-primary-700 px-4 py-2 text-sm text-white hover:bg-primary-800"
          >
            銘柄を登録する
          </a>
        </div>
      ) : (
        <Suspense fallback={<div>読み込み中...</div>}>
          <CompanyList
            companies={companies}
            total={total}
            sectors={sectors}
            currentStatus={status}
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={params}
          />
        </Suspense>
      )}
    </div>
  );
}
