// 帳票（見積書・請求書・納品書）の共通定義
// 巧健さんの現行Excel様式（見積書・請求書・納品書が1シートに横並び）に合わせている。
// 3帳票は quotes テーブルの別レコードとして持ち（document_kind で区別）、
// 見積書から複製して作る。複製後はそれぞれ独立して編集できる。
// 帳票ごとの差分はこのファイルだけで管理する。

export type DocumentKind = "quote" | "invoice" | "delivery";

export const COMPANY_INFO = {
  registration_no: "T8250001014149",
  name: "株式会社巧健",
  representative: "代表取締役 深井 健広",
  zip: "〒745-0303",
  address: "山口県周南市大字鹿野中字田原830-1",
  tel: "0834-68-0070",
  fax: "0834-68-0080",
};

/** 振込先（請求書のみ記載） */
export const BANK_ACCOUNTS = [
  { bank: "山口銀行", branch: "富田支店", account: "（普）5043790" },
  { bank: "広島銀行", branch: "徳山支店", account: "（普）3093098" },
];

export const BANK_NOTE = "※振込手数料は1万円未満の場合、貴社負担にてお願いいたします。";

interface DocumentConfig {
  /** 帳票のタイトル（印刷面） */
  printTitle: string;
  /** 画面上の名称 */
  label: string;
  listDescription: string;
  /** 一覧・印刷面の番号ラベル */
  numberLabel: string;
  /** 印刷面のリード文 */
  leadText: string;
  /** 金額ボックスのラベル */
  amountBoxLabel: string;
  /** 一覧の金額列ラベル */
  listAmountLabel: string;
  /** 客先側の参照番号ラベル */
  referenceLabel: string;
  /** 金額を税込で出すか（false なら税抜） */
  taxIncluded: boolean;
  /** 合計欄に小計・消費税の内訳を出すか */
  showTaxBreakdown: boolean;
  /** 振込先を記載するか */
  showBankAccounts: boolean;
  /** 一覧ページのパス */
  listPath: string;
}

/** 帳票の印刷ページ。種別はレコードの document_kind から判定する。 */
export function printPath(documentId: number): string {
  return `/documents/${documentId}/print`;
}

/** 見積書の編集ページ（請求書・納品書も同じ画面で編集する） */
export function editPath(documentId: number): string {
  return `/quotes/${documentId}/edit`;
}

export const DOCUMENT_CONFIG: Record<DocumentKind, DocumentConfig> = {
  quote: {
    printTitle: "御　見　積　書",
    label: "見積書",
    listDescription: "見積書の作成・管理",
    numberLabel: "見積番号",
    leadText: "下記のとおり御見積申し上げます。",
    amountBoxLabel: "御見積金額（税別）",
    listAmountLabel: "御見積金額（税別）",
    referenceLabel: "貴見積依頼番号",
    taxIncluded: false,
    showTaxBreakdown: false,
    showBankAccounts: false,
    listPath: "/quotes",
  },
  invoice: {
    printTitle: "御　請　求　書",
    label: "請求書",
    listDescription: "見積データをもとに請求書を発行",
    numberLabel: "注文番号",
    leadText: "下記のとおり御請求申し上げます。",
    amountBoxLabel: "御請求金額（税込）",
    listAmountLabel: "御請求金額（税込）",
    referenceLabel: "貴注文番号",
    taxIncluded: true,
    showTaxBreakdown: true,
    showBankAccounts: true,
    listPath: "/invoices",
  },
  delivery: {
    printTitle: "納　品　書",
    label: "納品書",
    listDescription: "見積データをもとに納品書を発行",
    numberLabel: "注文番号",
    leadText: "下記のとおり納品いたします。",
    amountBoxLabel: "合計金額（税別）",
    listAmountLabel: "合計金額（税別）",
    referenceLabel: "貴注文番号",
    taxIncluded: false,
    showTaxBreakdown: false,
    showBankAccounts: false,
    listPath: "/delivery-notes",
  },
};

/**
 * 帳票に印字する番号。
 * 見積書は見積番号、請求書・納品書は受注番号（未受注なら見積番号で代替）。
 */
export function documentNumber(
  kind: DocumentKind,
  quote: { quote_number: string; converted_order_id?: string | null }
): string {
  if (kind === "quote") return quote.quote_number;
  return quote.converted_order_id || quote.quote_number;
}
