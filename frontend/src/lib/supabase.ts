import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 型定義
export type ScreenedCompany = {
  company_code: string;
  company_name: string;
  sector: string | null;
  market: string | null;
  listing_date: string | null;
  market_cap: number | null;
  stock_price: number | null;
  revenue_2y: number | null;
  revenue_1y: number | null;
  revenue_cy: number | null;
  revenue_ny: number | null;
  op_2y: number | null;
  op_1y: number | null;
  op_cy: number | null;
  op_ny: number | null;
  total_assets: number | null;
  equity: number | null;
  net_income: number | null;
  operating_cf: number | null;
  investing_cf: number | null;
  free_cf: number | null;
  tk_deviation_revenue: number | null;
  tk_deviation_op: number | null;
  equity_ratio: number | null;
  revenue_growth_2y_1y: number | null;
  revenue_growth_1y_cy: number | null;
  revenue_growth_cy_ny: number | null;
  operating_margin: number | null;
  op_growth_2y_1y: number | null;
  op_growth_1y_cy: number | null;
  op_growth_cy_ny: number | null;
  roa: number | null;
  per_forward: number | null;
  pbr: number | null;
  dividend_yield: number | null;
  status: "PASS" | "FAIL" | "REVIEW";
  review_reasons: ReviewReason[];
  failed_reasons: FailedReason[];
  updated_at: string;
  price_updated_at: string | null;
  data_status: "fresh" | "stale";
  data_source: string | null;
};

export type ReviewReason = {
  code: string;
  field?: string;
  name?: string;
  message: string;
};

export type FailedReason = {
  code?: string;
  field: string;
  name?: string;
  value: number | string;
  condition: string;
  message: string;
};

export type WatchedTicker = {
  company_code: string;
  created_at: string;
};

// スクリーニング条件
export type ScreeningCondition = {
  field: string;
  name: string;
  operator: string;
  threshold: number | string;
  displayOnly: boolean;
  description: string;
};

// API レスポンス型
export type CompanyListResponse = {
  data: ScreenedCompany[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

// フィルタパラメータ
export type CompanyFilter = {
  status?: "PASS" | "REVIEW";
  q?: string;
  sector?: string;
  minCap?: number;
  maxCap?: number;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};
