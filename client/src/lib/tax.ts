// 消費税の計算（見積書で共通利用）
// 巧健さんの取り扱いは鋼材加工のため軽減税率の対象外。全明細を一律10％で計算する。
// 明細ごとに税率を分ける必要が出た場合は、ここを税率別の集計に差し替える。

export const TAX_RATE = 0.1;
export const TAX_RATE_LABEL = "10％";

/** 税抜の小計（端数を丸めた課税対象額） */
export function taxableAmount(subtotal: number): number {
  return Math.round(subtotal);
}

/** 消費税額。1円未満は切り捨て */
export function taxAmount(subtotal: number): number {
  return Math.floor(taxableAmount(subtotal) * TAX_RATE);
}

/** 税込の合計 */
export function totalWithTax(subtotal: number): number {
  return taxableAmount(subtotal) + taxAmount(subtotal);
}
