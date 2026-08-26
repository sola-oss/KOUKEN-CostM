// 帳票（見積書・請求書・納品書）の共通定義
// 巧健さんの現行Excel様式（見積書・請求書・納品書が1シートに横並び）に合わせている。
// 3帳票は quotes テーブルの別レコードとして持ち（document_kind で区別）、
// 見積書から複製して作る。複製後はそれぞれ独立して編集できる。
// 帳票ごとの差分はこのファイルだけで管理する。

export type DocumentKind = "quote" | "invoice" | "delivery";

/**
 * 帳票のステータス。
 * 「承認済」は使われていなかったので廃止し、代わりに「請求済」を置いた。
 * 「受注済」は見積書から受注を作ったときに自動で付く。
 */
export type DocumentStatus = "draft" | "issued" | "invoiced" | "converted";

interface StatusConfig {
  label: string;
  /** バッジの色 */
  className: string;
  /** 一覧の行の色。下書きは色を付けない。 */
  rowClassName: string;
}

export const STATUS_CONFIG: Record<DocumentStatus, StatusConfig> = {
  draft: {
    label: "下書き",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    rowClassName: "",
  },
  issued: {
    label: "発行済",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    rowClassName: "bg-blue-50 dark:bg-blue-950/30",
  },
  invoiced: {
    label: "請求済",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    rowClassName: "bg-green-50 dark:bg-green-950/30",
  },
  converted: {
    label: "受注済",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    rowClassName: "bg-purple-50 dark:bg-purple-950/30",
  },
};

/** 画面から手で選べるステータス。「受注済」は受注を作ったときに自動で付くので入れない。 */
export const SELECTABLE_STATUSES: DocumentStatus[] = ["draft", "issued", "invoiced"];

export function statusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status as DocumentStatus] ?? STATUS_CONFIG.draft;
}

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
  /** 社印の画像を印字するか。請求書は実際に刻印を押すので印字しない（場所だけ空ける） */
  showSeal: boolean;
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
    numberLabel: "受注番号/見積番号",
    leadText: "下記のとおり御見積申し上げます。",
    amountBoxLabel: "御見積金額（税別）",
    listAmountLabel: "御見積金額（税別）",
    referenceLabel: "貴見積依頼番号",
    taxIncluded: false,
    showTaxBreakdown: false,
    showBankAccounts: false,
    showSeal: true,
    listPath: "/quotes",
  },
  invoice: {
    printTitle: "御　請　求　書",
    label: "請求書",
    listDescription: "見積データをもとに請求書を発行",
    numberLabel: "受注番号/見積番号",
    leadText: "下記のとおり御請求申し上げます。",
    amountBoxLabel: "御請求金額（税込）",
    listAmountLabel: "御請求金額（税込）",
    referenceLabel: "貴注文番号",
    taxIncluded: true,
    showTaxBreakdown: true,
    showBankAccounts: true,
    showSeal: false,
    listPath: "/invoices",
  },
  delivery: {
    printTitle: "納　品　書",
    label: "納品書",
    listDescription: "見積データをもとに納品書を発行",
    numberLabel: "受注番号/見積番号",
    leadText: "下記のとおり納品いたします。",
    amountBoxLabel: "合計金額（税別）",
    listAmountLabel: "合計金額（税別）",
    referenceLabel: "貴注文番号",
    taxIncluded: false,
    showTaxBreakdown: false,
    showBankAccounts: false,
    showSeal: true,
    listPath: "/delivery-notes",
  },
};

/** 帳票の番号を決めるのに使う項目。請求書・納品書は複製元の見積書の分も持つ。 */
export interface DocumentNumberSource {
  quote_number: string;
  converted_order_id?: string | null;
  /** 複製元の見積番号（請求書・納品書のみ） */
  source_quote_number?: string | null;
  /** 複製元の見積書に紐づく受注番号（請求書・納品書のみ） */
  source_order_id?: string | null;
}

/**
 * 帳票に印字する「受注番号/見積番号」。
 *
 * 巧健さんは3帳票とも受注番号（ko…）で呼ぶので、受注番号を最優先で出す。
 * 請求書・納品書は見積書の複製で、複製した「時点」の受注番号しか持たない。
 * あとから見積書を受注に紐付けた分は複製側が空のままなので、複製元をたどって補う。
 * 実運用では見積書の見積番号欄にもko番号が手入力されているため、
 * 最後の代替として複製元の見積番号を出せば、たいていは正しい受注番号になる。
 * どれも無ければ自動採番した自分の番号（QT-… / IV-… / DN-…）を出す。
 */
export function documentNumber(kind: DocumentKind, doc: DocumentNumberSource): string {
  if (kind === "quote") return doc.converted_order_id || doc.quote_number;
  return (
    doc.converted_order_id ||
    doc.source_order_id ||
    doc.source_quote_number ||
    doc.quote_number
  );
}
