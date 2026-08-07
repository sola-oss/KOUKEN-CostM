// Summary Invoices API Routes (合計請求書)
// 得意先ごとに、発行済みの請求書をまとめて請求する帳票。
import { Router } from 'express';
import { ProductionDAO } from '../dao/production-dao.js';
import {
  insertSummaryInvoiceSchema,
  updateSummaryInvoiceSchema,
  insertSummaryInvoiceItemSchema,
} from '../../shared/production-schema.js';

const router = Router();
const dao = new ProductionDAO();

const itemSchema = insertSummaryInvoiceItemSchema.omit({ summary_invoice_id: true }).partial();

function parseItems(items: unknown) {
  if (!Array.isArray(items)) return undefined;
  return items.map((item: unknown, idx: number) => {
    const v = itemSchema.safeParse(item);
    if (!v.success) throw new Error(`明細${idx + 1}: ${v.error.errors.map(e => e.message).join(', ')}`);
    return v.data;
  });
}

// GET /summary-invoices/candidates?client_name=&from=&to= - 合計請求書に載せられる請求書の候補
router.get('/candidates', async (req, res) => {
  try {
    const { client_name, from, to } = req.query as Record<string, string>;
    if (!client_name) {
      return res.status(400).json({ error: 'Bad request', message: '得意先名は必須です' });
    }
    const data = await dao.getSummaryInvoiceCandidates(client_name, from || undefined, to || undefined);
    res.json({ data });
  } catch (error: unknown) {
    console.error('Get summary invoice candidates error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch candidates';
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// GET /summary-invoices - 合計請求書一覧
router.get('/', async (_req, res) => {
  try {
    const data = await dao.getSummaryInvoices();
    res.json({ data });
  } catch (error: unknown) {
    console.error('Get summary invoices error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch summary invoices' });
  }
});

// GET /summary-invoices/:id - 合計請求書詳細（明細含む）
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid summary invoice ID' });
    const data = await dao.getSummaryInvoiceById(id);
    if (!data) return res.status(404).json({ error: 'Not found', message: '合計請求書が見つかりません' });
    res.json({ data });
  } catch (error: unknown) {
    console.error('Get summary invoice error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch summary invoice' });
  }
});

// POST /summary-invoices - 合計請求書作成
router.post('/', async (req, res) => {
  try {
    const { items = [], ...summaryData } = req.body;
    const validation = insertSummaryInvoiceSchema.safeParse(summaryData);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }
    const id = await dao.createSummaryInvoice(validation.data, parseItems(items) ?? []);
    const data = await dao.getSummaryInvoiceById(id);
    res.status(201).json({ data });
  } catch (error: unknown) {
    console.error('Create summary invoice error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create summary invoice';
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// PATCH /summary-invoices/:id - 合計請求書更新
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid summary invoice ID' });
    const { items, ...summaryData } = req.body;
    const validation = updateSummaryInvoiceSchema.safeParse(summaryData);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }
    await dao.updateSummaryInvoice(id, validation.data, parseItems(items));
    const data = await dao.getSummaryInvoiceById(id);
    res.json({ data });
  } catch (error: unknown) {
    console.error('Update summary invoice error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update summary invoice';
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// DELETE /summary-invoices/:id - 合計請求書削除
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid summary invoice ID' });
    await dao.deleteSummaryInvoice(id);
    res.status(204).send();
  } catch (error: unknown) {
    console.error('Delete summary invoice error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to delete summary invoice' });
  }
});

export default router;
