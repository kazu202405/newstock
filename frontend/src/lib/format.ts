/**
 * 表示フォーマット用ユーティリティ
 */

// 数値を小数2桁でフォーマット
export function formatNumber(value: number | null, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  return value.toFixed(decimals);
}

// パーセント表示
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

// 億円表示
export function formatOku(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(1)}億`;
}

// 倍率表示
export function formatMultiple(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(2)}倍`;
}

// 日時フォーマット（JST）
export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

// 日付のみフォーマット
export function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

// 値の正負でクラスを返す
export function getValueClass(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "value-missing";
  }
  if (value > 0) return "value-positive";
  if (value < 0) return "value-negative";
  return "value-neutral";
}

// ステータスバッジのクラスを返す
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "PASS":
      return "badge badge-pass";
    case "REVIEW":
      return "badge badge-review";
    case "FAIL":
      return "badge badge-fail";
    default:
      return "badge";
  }
}

// ステータスの日本語表示
export function getStatusLabel(status: string): string {
  switch (status) {
    case "PASS":
      return "条件合致";
    case "REVIEW":
      return "要確認";
    case "FAIL":
      return "条件未達";
    default:
      return status;
  }
}
