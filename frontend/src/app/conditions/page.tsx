export default function ConditionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-primary-900 mb-6">
        スクリーニング条件
      </h1>

      {/* 条件一覧 */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">
          判定条件（全て満たす場合のみ「条件合致」）
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-200">
                <th className="text-left py-2 pr-4">項目</th>
                <th className="text-left py-2 px-4">条件</th>
                <th className="text-left py-2 pl-4">説明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              <tr>
                <td className="py-3 pr-4">TK会社乖離(売上高)</td>
                <td className="py-3 px-4 font-mono">&gt; 0%</td>
                <td className="py-3 pl-4 text-primary-600">
                  会社予想が四季報予想を上回っている
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">TK会社乖離(営業利益)</td>
                <td className="py-3 px-4 font-mono">&gt; 0%</td>
                <td className="py-3 pl-4 text-primary-600">
                  会社予想が四季報予想を上回っている
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">時価総額</td>
                <td className="py-3 px-4 font-mono">&lt;= 700億円</td>
                <td className="py-3 pl-4 text-primary-600">
                  中小型株に限定
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">自己資本比率(前期)</td>
                <td className="py-3 px-4 font-mono">&gt;= 30%</td>
                <td className="py-3 pl-4 text-primary-600">
                  財務健全性の確保
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">売上高増減率(2期前→前期)</td>
                <td className="py-3 px-4 font-mono">&gt; 0%</td>
                <td className="py-3 pl-4 text-primary-600">
                  売上成長が継続
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">売上高増減率(前期→今期予)</td>
                <td className="py-3 px-4 font-mono">&gt; 0%</td>
                <td className="py-3 pl-4 text-primary-600">
                  売上成長が継続
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">売上高増減率(今期予→来期予)</td>
                <td className="py-3 px-4 font-mono">&gt; 0%</td>
                <td className="py-3 pl-4 text-primary-600">
                  売上成長が継続見込み
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">売上高営業利益率(前期)</td>
                <td className="py-3 px-4 font-mono">&gt;= 10%</td>
                <td className="py-3 pl-4 text-primary-600">
                  高収益体質
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">営業利益増減率(2期前→前期)</td>
                <td className="py-3 px-4 font-mono">&gt; 0%</td>
                <td className="py-3 pl-4 text-primary-600">
                  利益成長が継続
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">営業利益増減率(前期→今期予)</td>
                <td className="py-3 px-4 font-mono">&gt; 0%</td>
                <td className="py-3 pl-4 text-primary-600">
                  利益成長が継続
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">営業利益増減率(今期予→来期予)</td>
                <td className="py-3 px-4 font-mono">&gt; 0%</td>
                <td className="py-3 pl-4 text-primary-600">
                  利益成長が継続見込み
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">営業CF(前期)</td>
                <td className="py-3 px-4 font-mono">&gt; 0億円</td>
                <td className="py-3 pl-4 text-primary-600">
                  本業でキャッシュ創出
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">フリーCF(前期)</td>
                <td className="py-3 px-4 font-mono">&gt; 0億円</td>
                <td className="py-3 pl-4 text-primary-600">
                  投資後もキャッシュ創出
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">上場年月</td>
                <td className="py-3 px-4 font-mono">&gt; 2012/12</td>
                <td className="py-3 pl-4 text-primary-600">
                  比較的新しい上場企業
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">ROA(前期)</td>
                <td className="py-3 px-4 font-mono">&gt; 4.5%</td>
                <td className="py-3 pl-4 text-primary-600">
                  資産効率が高い
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">PER(来期)</td>
                <td className="py-3 px-4 font-mono">&lt; 40倍</td>
                <td className="py-3 pl-4 text-primary-600">
                  割高すぎない水準
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">PBR(直近Q)</td>
                <td className="py-3 px-4 font-mono">&lt; 10倍</td>
                <td className="py-3 pl-4 text-primary-600">
                  割高すぎない水準
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-primary-500 mt-4">
          ※ 配当利回りは表示のみで、判定条件には含まれません。
        </p>
        <p className="text-sm text-primary-500 mt-2">
          ※ TK会社乖離 = (会社予想 - 四季報予想) / 四季報予想 × 100
          （四季報予想は手動登録データを使用）
        </p>
      </div>

      {/* ステータス説明 */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">
          ステータスの説明
        </h2>

        <dl className="space-y-4">
          <div className="flex gap-4">
            <dt className="flex-shrink-0">
              <span className="badge badge-pass">条件合致</span>
            </dt>
            <dd className="text-primary-700">
              全ての条件を満たしている企業です。
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="flex-shrink-0">
              <span className="badge badge-review">要確認</span>
            </dt>
            <dd className="text-primary-700">
              データの欠損や計算不可の項目があり、機械的な判定が完了できない企業です。
              詳細ページで理由を確認してください。
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="flex-shrink-0">
              <span className="badge badge-stale">更新遅延</span>
            </dt>
            <dd className="text-primary-700">
              データ取得に失敗し、前回の値を表示しています。
              最新の情報とは異なる可能性があります。
            </dd>
          </div>
        </dl>
      </div>

      {/* 欠損・計算不可の扱い */}
      <div className="bg-white rounded-lg border border-primary-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">
          欠損・計算不可の扱い
        </h2>

        <div className="space-y-4 text-sm text-primary-700">
          <div>
            <h3 className="font-medium text-primary-900">データ欠損の場合</h3>
            <p className="mt-1">
              条件判定に必要な項目が取得できない場合、「要確認」として分類されます。
              表示は「—」となり、理由として「データ取得不可（要確認）」と表示されます。
            </p>
          </div>

          <div>
            <h3 className="font-medium text-primary-900">計算不可の場合</h3>
            <p className="mt-1">
              増減率などの計算で分母が0の場合、計算不可として「要確認」に分類されます。
              表示は「計算不可（前期=0）」のような固定文言で表示されます。
            </p>
          </div>

          <div>
            <h3 className="font-medium text-primary-900">表示専用項目</h3>
            <p className="mt-1">
              配当利回りなど、条件判定に含まれない項目が欠損しても、
              ステータスには影響しません。
            </p>
          </div>
        </div>
      </div>

      {/* 免責事項 */}
      <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
        <h2 className="text-lg font-semibold text-amber-900 mb-4">
          免責事項
        </h2>

        <div className="space-y-3 text-sm text-amber-800">
          <p>
            <strong>投資助言ではありません：</strong>
            本サイトは特定の銘柄の売買を推奨するものではありません。
            「条件合致」は機械的なスクリーニング結果であり、
            投資判断は必ずご自身の責任で行ってください。
          </p>
          <p>
            <strong>正確性の保証なし：</strong>
            掲載情報はyfinance/yahooqueryから取得した非公式データに基づいています。
            情報の正確性、完全性、最新性は保証されません。
          </p>
          <p>
            <strong>遅延の可能性：</strong>
            データ取得の失敗やシステムの都合により、
            情報が最新でない場合があります。
            「更新遅延」表示がある場合は特にご注意ください。
          </p>
          <p>
            <strong>自己責任：</strong>
            本サイトの情報を利用して生じたいかなる損害についても、
            運営者は一切の責任を負いません。
          </p>
        </div>
      </div>
    </div>
  );
}
