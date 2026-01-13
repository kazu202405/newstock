import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 金融サイト向け落ち着いた配色
        primary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // ステータス色（彩度低め）
        pass: "#059669",    // 緑（落ち着いた）
        fail: "#dc2626",    // 赤
        review: "#d97706",  // オレンジ（要確認）
      },
      fontFamily: {
        sans: [
          "Hiragino Sans",
          "Hiragino Kaku Gothic ProN",
          "Noto Sans JP",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
