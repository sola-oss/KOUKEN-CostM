// 2026-10-16 一回限り: 作成済みの請求書の元になった見積書と受注を「請求済」にそろえる。
// 請求書を作った時点で自動で請求済にする仕組みは、これより前に作られた分には効かないため。
//
//   npx tsx server/scripts/backfill-invoiced-2026-10-16.ts          … 変更前の状態を保存するだけ（DBは触らない）
//   npx tsx server/scripts/backfill-invoiced-2026-10-16.ts --apply  … 保存してから請求済にする
//   npx tsx server/scripts/backfill-invoiced-2026-10-16.ts --restore <保存ファイル> … 保存した状態に戻す
//
// updated_at は変えない。利用状況を updated_at で見ているので、一括補正で「今日触った」ように見せないため。
import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function loadTargets() {
  const { data: invoices, error } = await supabase
    .from("quotes")
    .select("id, source_quote_id, converted_order_id")
    .eq("document_kind", "invoice");
  if (error) throw error;

  const quoteIds = Array.from(new Set(invoices!.map((i) => i.source_quote_id).filter((v): v is number => !!v)));
  const { data: quotes, error: qe } = await supabase
    .from("quotes")
    .select("id, status, converted_order_id, updated_at")
    .in("id", quoteIds);
  if (qe) throw qe;

  const quoteOrder = new Map(quotes!.map((q) => [q.id, q.converted_order_id as string | null]));
  const orderIds = Array.from(new Set(
    invoices!
      .map((i) => i.converted_order_id ?? (i.source_quote_id ? quoteOrder.get(i.source_quote_id) : null))
      .filter((v): v is string => !!v),
  ));
  const { data: orders, error: oe } = await supabase
    .from("orders")
    .select("order_id, is_invoiced, updated_at")
    .in("order_id", orderIds);
  if (oe) throw oe;

  return { quotes: quotes!, orders: orders! };
}

async function restore(file: string) {
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const q of saved.quotes) {
    const { error } = await supabase.from("quotes").update({ status: q.status }).eq("id", q.id);
    if (error) throw error;
  }
  for (const o of saved.orders) {
    const { error } = await supabase.from("orders").update({ is_invoiced: o.is_invoiced }).eq("order_id", o.order_id);
    if (error) throw error;
  }
  console.log(`戻しました: 見積書 ${saved.quotes.length}件 / 受注 ${saved.orders.length}件`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--restore") return restore(args[1]);

  const before = await loadTargets();
  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `invoiced-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(before, null, 2));
  console.log(`変更前を保存: ${file}（見積書 ${before.quotes.length}件 / 受注 ${before.orders.length}件）`);

  if (!args.includes("--apply")) return;

  const quoteIds = before.quotes.filter((q) => q.status !== "invoiced").map((q) => q.id);
  const orderIds = before.orders.filter((o) => o.is_invoiced !== true).map((o) => o.order_id);

  if (quoteIds.length) {
    const { error } = await supabase.from("quotes").update({ status: "invoiced" }).in("id", quoteIds);
    if (error) throw error;
  }
  if (orderIds.length) {
    const { error } = await supabase.from("orders").update({ is_invoiced: true }).in("order_id", orderIds);
    if (error) throw error;
  }
  console.log(`請求済にしました: 見積書 ${quoteIds.length}件 / 受注 ${orderIds.length}件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
