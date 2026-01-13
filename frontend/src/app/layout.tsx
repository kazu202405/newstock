import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "株式スクリーニング",
  description: "登録銘柄の定量スクリーニング結果",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          {/* ヘッダー */}
          <header className="border-b border-primary-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-4">
              <div className="flex items-center justify-between">
                <a href="/" className="text-xl font-semibold text-primary-900">
                  株式スクリーニング
                </a>
                <nav className="flex gap-6 text-sm">
                  <a
                    href="/"
                    className="text-primary-600 hover:text-primary-900"
                  >
                    一覧
                  </a>
                  <a
                    href="/conditions"
                    className="text-primary-600 hover:text-primary-900"
                  >
                    条件説明
                  </a>
                  <a
                    href="/admin/register"
                    className="text-primary-600 hover:text-primary-900"
                  >
                    銘柄登録
                  </a>
                </nav>
              </div>
            </div>
          </header>

          {/* メインコンテンツ */}
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

          {/* フッター */}
          <footer className="border-t border-primary-200 bg-white mt-12">
            <div className="mx-auto max-w-7xl px-4 py-6">
              <p className="text-center text-xs text-primary-500">
                本サイトは投資助言を行うものではありません。
                掲載情報の正確性は保証されず、投資判断は自己責任でお願いします。
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
