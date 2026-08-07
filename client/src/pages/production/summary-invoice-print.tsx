// 合計請求書の印刷帳票（巧健さんの現行Excel様式に合わせる）
import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TAX_RATE_LABEL, taxableAmount, taxAmount, totalWithTax } from "@/lib/tax";
import { BANK_ACCOUNTS, BANK_NOTE, COMPANY_INFO } from "@/lib/documents";

interface SummaryItem {
  id?: number;
  sort_order: number;
  order_id: string | null;
  order_date: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  amount: number | null;
  notes: string | null;
}

interface SummaryInvoice {
  id: number;
  summary_number: string;
  issue_date: string | null;
  client_name: string;
  billing_month: string | null;
  items: SummaryItem[];
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("ja-JP").format(Math.round(n));
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const cell: React.CSSProperties = { padding: "4px 8px", border: "1px solid #ccc" };

export default function SummaryInvoicePrint() {
  const params = useParams();
  const summaryId = parseInt(params.id!, 10);

  const { data, isLoading, error } = useQuery<{ data: SummaryInvoice }>({
    queryKey: ["/api/summary-invoices", summaryId],
    queryFn: () => fetch(`/api/summary-invoices/${summaryId}`).then((r) => r.json()),
    enabled: !!summaryId,
  });

  const summary = data?.data;

  useEffect(() => {
    if (summary && !isLoading) {
      setTimeout(() => window.print(), 500);
    }
  }, [summary, isLoading]);

  const subtotal = (summary?.items || []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  if (isLoading) {
    return <div style={{ padding: "40px", fontFamily: "sans-serif" }}>読み込み中...</div>;
  }

  if (error || !summary) {
    return <div style={{ padding: "40px", fontFamily: "sans-serif" }}>合計請求書が見つかりません</div>;
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        * { box-sizing: border-box; }
        body {
          font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif;
          font-size: 11px;
          color: #000;
          background: #fff;
        }
      `}</style>

      <div className="no-print" style={{ padding: "8px 16px", background: "#f0f0f0", borderBottom: "1px solid #ccc" }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "6px 16px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
        >
          印刷する
        </button>
        <button
          onClick={() => window.close()}
          style={{ padding: "6px 16px", background: "transparent", color: "#333", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", fontSize: "13px", marginLeft: "8px" }}
        >
          閉じる
        </button>
      </div>

      <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "20px", background: "#fff" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: "6px", margin: 0 }}>
            合　計　請　求　書
          </h1>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>
              {summary.client_name}　御中
            </div>
            <div style={{ fontSize: "11px" }}>下記のとおり御請求申し上げます。</div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", marginBottom: "2px" }}>
              発行年月日　{formatDate(summary.issue_date)}
            </div>
            <div style={{ fontSize: "10px", color: "#555", marginBottom: "6px" }}>
              登録番号　{COMPANY_INFO.registration_no}
            </div>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>{COMPANY_INFO.name}</div>
            <div style={{ fontSize: "11px" }}>{COMPANY_INFO.representative}</div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>{COMPANY_INFO.address}</div>
            <div style={{ fontSize: "10px", color: "#555" }}>　　TEL : {COMPANY_INFO.tel}</div>
            <div style={{ fontSize: "10px", color: "#555" }}>　　FAX : {COMPANY_INFO.fax}</div>
          </div>
        </div>

        <div style={{ border: "2px solid #000", padding: "12px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", marginBottom: "4px" }}>御請求金額</div>
          <div style={{ fontSize: "22px", fontWeight: "bold" }}>
            ¥ {formatNumber(totalWithTax(subtotal))}
            <span style={{ fontSize: "12px", fontWeight: "normal" }}>円（税込み）</span>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "10px" }}>
          <thead>
            <tr style={{ background: "#333", color: "#fff" }}>
              <th style={{ ...cell, border: "1px solid #333", width: "12%", textAlign: "center" }}>受注日</th>
              <th style={{ ...cell, border: "1px solid #333", width: "14%", textAlign: "center" }}>受　注　番　号</th>
              <th style={{ ...cell, border: "1px solid #333", textAlign: "center" }}>適　用</th>
              <th style={{ ...cell, border: "1px solid #333", width: "7%", textAlign: "center" }}>数量</th>
              <th style={{ ...cell, border: "1px solid #333", width: "7%", textAlign: "center" }}>単位</th>
              <th style={{ ...cell, border: "1px solid #333", width: "16%", textAlign: "center" }}>金　　　額</th>
              <th style={{ ...cell, border: "1px solid #333", width: "14%", textAlign: "center" }}>備　考</th>
            </tr>
          </thead>
          <tbody>
            {summary.items.map((item, idx) => (
              <tr key={item.id ?? idx}>
                <td style={{ ...cell, textAlign: "center" }}>{item.order_date || ""}</td>
                <td style={{ ...cell, textAlign: "center" }}>{item.order_id || ""}</td>
                <td style={cell}>{item.description || ""}</td>
                <td style={{ ...cell, textAlign: "right" }}>{item.quantity ?? ""}</td>
                <td style={{ ...cell, textAlign: "center" }}>{item.unit || ""}</td>
                <td style={{ ...cell, textAlign: "right" }}>
                  {item.amount != null ? formatNumber(item.amount) : ""}
                </td>
                <td style={cell}>{item.notes || ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ ...cell, textAlign: "right" }}>小計（{TAX_RATE_LABEL}対象）</td>
              <td style={{ ...cell, textAlign: "right" }}>{formatNumber(taxableAmount(subtotal))}</td>
              <td style={cell}></td>
            </tr>
            <tr>
              <td colSpan={5} style={{ ...cell, textAlign: "right" }}>消費税（{TAX_RATE_LABEL}）</td>
              <td style={{ ...cell, textAlign: "right" }}>{formatNumber(taxAmount(subtotal))}</td>
              <td style={cell}></td>
            </tr>
            <tr style={{ fontWeight: "bold" }}>
              <td colSpan={5} style={{ ...cell, textAlign: "right", borderTop: "2px solid #000" }}>当月合計請求額</td>
              <td style={{ ...cell, textAlign: "right", borderTop: "2px solid #000", fontSize: "12px" }}>
                {formatNumber(totalWithTax(subtotal))}
              </td>
              <td style={{ ...cell, borderTop: "2px solid #000" }}></td>
            </tr>
          </tfoot>
        </table>

        <div style={{ fontSize: "11px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>振込先：</span>
            <div>
              {BANK_ACCOUNTS.map((b) => (
                <div key={`${b.bank}${b.branch}`}>
                  {b.bank}　{b.branch}　{b.account}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: "6px", fontSize: "10px" }}>{BANK_NOTE}</div>
        </div>
      </div>
    </>
  );
}
