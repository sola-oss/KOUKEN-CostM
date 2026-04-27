import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import sealImage from "@assets/image_1777272205185.png";

interface QuoteItem {
  id?: number;
  sort_order: number;
  product_name: string | null;
  model_number: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  notes: string | null;
}

interface Quote {
  id: number;
  quote_number: string;
  issue_date: string | null;
  client_name: string;
  contact_person: string | null;
  client_request_no: string | null;
  status: string;
  converted_order_id: string | null;
  items: QuoteItem[];
}

const COMPANY_INFO = {
  registration_no: "T8250001014149",
  name: "株式会社巧健",
  representative: "代表取締役 深井 健広",
  zip: "〒746-0017",
  address: "山口県周南市浦上1丁目11番18号",
  tel: "0834-33-9007",
  fax: "0834-33-9008",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("ja-JP").format(Math.round(n)) + "円";
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function QuotesPrint() {
  const params = useParams();
  const quoteId = parseInt(params.id!, 10);

  const { data: quoteData, isLoading, error } = useQuery<{ data: Quote }>({
    queryKey: ["/api/quotes", quoteId],
    queryFn: () => fetch(`/api/quotes/${quoteId}`).then((r) => r.json()),
    enabled: !!quoteId,
  });

  const quote = quoteData?.data;

  useEffect(() => {
    if (quote && !isLoading) {
      setTimeout(() => window.print(), 500);
    }
  }, [quote, isLoading]);

  const subtotal = (quote?.items || []).reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  );

  if (isLoading) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
        読み込み中...
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
        見積書が見つかりません
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        * {
          box-sizing: border-box;
        }
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

      <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "20px 20px", background: "#fff" }}>
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: "4px", margin: 0 }}>
            御　見　積　書
          </h1>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>
              {quote.client_name}　御中
            </div>
            {quote.contact_person && (
              <div style={{ fontSize: "13px", marginBottom: "4px" }}>
                ご担当：{quote.contact_person}　様
              </div>
            )}
            {quote.client_request_no && (
              <div style={{ fontSize: "11px", marginTop: "8px" }}>
                貴見積依頼番号：{quote.client_request_no}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            {/* 印鑑を右列の最上部に配置 */}
            <div style={{ marginBottom: "6px" }}>
              <img
                src={sealImage}
                alt="印鑑"
                style={{
                  width: "76px",
                  height: "76px",
                  objectFit: "contain",
                  opacity: 0.85,
                }}
              />
            </div>
            <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>
              登録番号　{COMPANY_INFO.registration_no}
            </div>
            <div style={{ fontSize: "11px", marginBottom: "2px" }}>
              発行年月日　{formatDate(quote.issue_date)}
            </div>
            <div style={{ fontSize: "11px", marginBottom: "2px" }}>
              見積番号　{quote.quote_number}
            </div>
            <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "6px" }}>
              {COMPANY_INFO.name}
            </div>
            <div style={{ fontSize: "11px" }}>{COMPANY_INFO.representative}</div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>
              {COMPANY_INFO.zip}
            </div>
            <div style={{ fontSize: "10px", color: "#555" }}>{COMPANY_INFO.address}</div>
            <div style={{ fontSize: "10px", color: "#555" }}>
              TEL {COMPANY_INFO.tel}　FAX {COMPANY_INFO.fax}
            </div>
          </div>
        </div>

        <div style={{ border: "2px solid #000", padding: "12px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", marginBottom: "4px" }}>御見積金額（消費税別）</div>
          <div style={{ fontSize: "22px", fontWeight: "bold" }}>
            ¥ {new Intl.NumberFormat("ja-JP").format(Math.round(subtotal))} ―
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "10px" }}>
          <thead>
            <tr style={{ background: "#333", color: "#fff" }}>
              <th style={{ padding: "6px 8px", textAlign: "center", width: "5%", border: "1px solid #333" }}>整番</th>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "27%", border: "1px solid #333" }}>品名</th>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "20%", border: "1px solid #333" }}>型番</th>
              <th style={{ padding: "6px 8px", textAlign: "right", width: "8%", border: "1px solid #333" }}>数量</th>
              <th style={{ padding: "6px 8px", textAlign: "center", width: "6%", border: "1px solid #333" }}>単位</th>
              <th style={{ padding: "6px 8px", textAlign: "right", width: "13%", border: "1px solid #333" }}>単価</th>
              <th style={{ padding: "6px 8px", textAlign: "right", width: "13%", border: "1px solid #333" }}>金額</th>
              <th style={{ padding: "6px 8px", textAlign: "left", border: "1px solid #333" }}>備考</th>
            </tr>
          </thead>
          <tbody>
            {(quote.items || []).map((item, idx) => {
              const amount = (item.quantity || 0) * (item.unit_price || 0);
              return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #ccc", fontWeight: "bold" }}>{idx + 1}</td>
                  <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}>{item.product_name || ""}</td>
                  <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}>{item.model_number || ""}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #ccc" }}>
                    {item.quantity != null ? item.quantity : ""}
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #ccc" }}>{item.unit || ""}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #ccc" }}>
                    {item.unit_price != null ? new Intl.NumberFormat("ja-JP").format(item.unit_price) : ""}
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #ccc" }}>
                    {amount > 0 ? new Intl.NumberFormat("ja-JP").format(Math.round(amount)) : ""}
                  </td>
                  <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}>{item.notes || ""}</td>
                </tr>
              );
            })}
            {Array.from({ length: Math.max(0, 10 - (quote.items?.length || 0)) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #ccc", color: "#aaa" }}>{(quote.items?.length || 0) + i + 1}</td>
                <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}>&nbsp;</td>
                <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}></td>
                <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}></td>
                <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}></td>
                <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}></td>
                <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}></td>
                <td style={{ padding: "5px 8px", border: "1px solid #ccc" }}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 16px", textAlign: "right", borderTop: "1px solid #ccc" }}>小　計</td>
                <td style={{ padding: "4px 16px", textAlign: "right", minWidth: "120px", borderTop: "1px solid #ccc" }}>
                  {new Intl.NumberFormat("ja-JP").format(Math.round(subtotal))} 円
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 16px", textAlign: "right", fontWeight: "bold", borderTop: "2px solid #000" }}>
                  合　計（消費税別）
                </td>
                <td style={{ padding: "6px 16px", textAlign: "right", fontWeight: "bold", fontSize: "13px", borderTop: "2px solid #000" }}>
                  {new Intl.NumberFormat("ja-JP").format(Math.round(subtotal))} 円
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
