import { NextResponse } from "next/server";
import type { ScreeningCondition } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * スクリーニング条件一覧
 */
const SCREENING_CONDITIONS: ScreeningCondition[] = [
  {
    field: "tk_deviation_revenue",
    name: "TK会社乖離(売上高)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "会社予想売上が四季報予想を上回る",
  },
  {
    field: "tk_deviation_op",
    name: "TK会社乖離(営業利益)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "会社予想営利が四季報予想を上回る",
  },
  {
    field: "market_cap",
    name: "時価総額(億円)",
    operator: "<=",
    threshold: 700.0,
    displayOnly: false,
    description: "時価総額700億円以下の中小型株",
  },
  {
    field: "equity_ratio",
    name: "自己資本比率(前期)(%)",
    operator: ">=",
    threshold: 30.0,
    displayOnly: false,
    description: "財務の安定性を示す指標",
  },
  {
    field: "revenue_growth_2y_1y",
    name: "売上高増減率(2期前→前期)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "売上が成長している",
  },
  {
    field: "revenue_growth_1y_cy",
    name: "売上高増減率(前期→今期予)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "今期も売上成長を予想",
  },
  {
    field: "revenue_growth_cy_ny",
    name: "売上高増減率(今期予→来期予)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "来期も売上成長を予想",
  },
  {
    field: "operating_margin",
    name: "売上高営業利益率(前期)(%)",
    operator: ">=",
    threshold: 10.0,
    displayOnly: false,
    description: "収益性を示す指標",
  },
  {
    field: "op_growth_2y_1y",
    name: "営業利益増減率(2期前→前期)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "営業利益が成長している",
  },
  {
    field: "op_growth_1y_cy",
    name: "営業利益増減率(前期→今期予)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "今期も営業利益成長を予想",
  },
  {
    field: "op_growth_cy_ny",
    name: "営業利益増減率(今期予→来期予)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "来期も営業利益成長を予想",
  },
  {
    field: "operating_cf",
    name: "営業CF前期(億円)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "営業活動からキャッシュを生み出している",
  },
  {
    field: "free_cf",
    name: "フリーCF前期(億円)",
    operator: ">",
    threshold: 0.0,
    displayOnly: false,
    description: "投資後も現金が残っている",
  },
  {
    field: "listing_date",
    name: "上場年月",
    operator: ">",
    threshold: "2012-12-01",
    displayOnly: false,
    description: "2012年12月以降に上場",
  },
  {
    field: "roa",
    name: "ROA(前期)(%)",
    operator: ">",
    threshold: 4.5,
    displayOnly: false,
    description: "資産効率が高い",
  },
  {
    field: "per_forward",
    name: "PER(来期)(倍)",
    operator: "<",
    threshold: 40.0,
    displayOnly: false,
    description: "来期予想ベースで割安",
  },
  {
    field: "pbr",
    name: "PBR(直近Q)(倍)",
    operator: "<",
    threshold: 10.0,
    displayOnly: false,
    description: "純資産に対して過度に割高でない",
  },
  {
    field: "dividend_yield",
    name: "配当利回り(今期)(%)",
    operator: ">",
    threshold: 0.0,
    displayOnly: true,
    description: "表示のみ（判定に含めない）",
  },
];

/**
 * GET /api/conditions
 * スクリーニング条件一覧を取得
 */
export async function GET() {
  return NextResponse.json({
    conditions: SCREENING_CONDITIONS,
    disclaimer: {
      title: "免責事項",
      items: [
        "本サイトは投資助言を行うものではありません。",
        "掲載情報の正確性・完全性は保証されません。",
        "データ更新には遅延が生じる可能性があります。",
        "投資判断は必ず自己責任でお願いいたします。",
      ],
    },
    dataHandling: {
      missingData: {
        display: "—",
        status: "REVIEW",
        reason: "データ取得不可（要確認）",
      },
      divisionByZero: {
        display: "計算不可（前期=0）",
        status: "REVIEW",
        reason: "分母が0のため計算できません",
      },
    },
  });
}
