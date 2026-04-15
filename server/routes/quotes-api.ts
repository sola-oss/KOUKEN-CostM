// Quotes API Routes (見積書)
import { Router } from 'express';
import { ProductionDAO } from '../dao/production-dao.js';
import {
  insertQuoteSchema,
  updateQuoteSchema,
  insertQuoteItemSchema,
  updateQuoteItemSchema,
} from '../../shared/production-schema.js';

const router = Router();
const dao = new ProductionDAO();

dao.ensureQuotesTablesCreated()
  .then(() => console.log('✓ Quotes tables ready (quotes-api)'))
  .catch((err: Error) => console.error('✗ Quotes table init error:', err.message));

// GET /quotes - 見積書一覧
router.get('/', async (req, res) => {
  try {
    const quotes = await dao.getQuotes();
    res.json({ data: quotes });
  } catch (error: unknown) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch quotes' });
  }
});

// POST /quotes - 見積書作成
router.post('/', async (req, res) => {
  try {
    const { items = [], ...quoteData } = req.body;
    const validation = insertQuoteSchema.safeParse(quoteData);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }
    const itemSchema = insertQuoteItemSchema.omit({ quote_id: true }).partial();
    const validatedItems = Array.isArray(items) ? items.map((item: unknown, idx: number) => {
      const v = itemSchema.safeParse(item);
      if (!v.success) throw new Error(`Item ${idx}: ${v.error.errors.map(e => e.message).join(', ')}`);
      return v.data;
    }) : [];
    const quoteId = await dao.createQuote(validation.data, validatedItems);
    const quote = await dao.getQuoteById(quoteId);
    res.status(201).json({ data: quote });
  } catch (error: unknown) {
    console.error('Create quote error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create quote';
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// GET /quotes/:id - 見積書詳細（明細含む）
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid quote ID' });
    const quote = await dao.getQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Not found', message: '見積書が見つかりません' });
    res.json({ data: quote });
  } catch (error: unknown) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch quote' });
  }
});

// PATCH /quotes/:id - 見積書更新
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid quote ID' });
    const { items, ...quoteData } = req.body;
    const validation = updateQuoteSchema.safeParse(quoteData);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }
    let validatedItems: Omit<import('../../shared/production-schema.js').InsertQuoteItem, 'quote_id'>[] | undefined;
    if (Array.isArray(items)) {
      const itemSchema = insertQuoteItemSchema.omit({ quote_id: true }).partial();
      validatedItems = items.map((item: unknown, idx: number) => {
        const v = itemSchema.safeParse(item);
        if (!v.success) throw new Error(`Item ${idx}: ${v.error.errors.map(e => e.message).join(', ')}`);
        return v.data;
      });
    }
    await dao.updateQuote(id, validation.data, validatedItems);
    const quote = await dao.getQuoteById(id);
    res.json({ data: quote });
  } catch (error: unknown) {
    console.error('Update quote error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update quote';
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// DELETE /quotes/:id - 見積書削除
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid quote ID' });
    await dao.deleteQuote(id);
    res.status(204).send();
  } catch (error: unknown) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to delete quote' });
  }
});

// POST /quotes/:id/convert - 見積書から受注を作成
router.post('/:id/convert', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid quote ID' });
    const orderId = await dao.convertQuoteToOrder(id);
    const quote = await dao.getQuoteById(id);
    res.json({ data: { order_id: orderId, quote }, message: '受注を作成しました' });
  } catch (error: unknown) {
    console.error('Convert quote error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to convert quote';
    const status = msg.includes('すでに受注済み') ? 409 : 500;
    res.status(status).json({ error: 'Conversion failed', message: msg });
  }
});

// GET /quotes/:id/items - 見積明細一覧
router.get('/:id/items', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id, 10);
    if (isNaN(quoteId)) return res.status(400).json({ error: 'Invalid quote ID' });
    const items = await dao.getQuoteItems(quoteId);
    res.json({ data: items });
  } catch (error: unknown) {
    console.error('Get quote items error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch quote items' });
  }
});

// POST /quotes/:id/items - 見積明細追加
router.post('/:id/items', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id, 10);
    if (isNaN(quoteId)) return res.status(400).json({ error: 'Invalid quote ID' });
    const validation = insertQuoteItemSchema.safeParse({ ...req.body, quote_id: quoteId });
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }
    const { quote_id: _qid, ...itemData } = validation.data;
    const item = await dao.addQuoteItem(quoteId, itemData);
    res.status(201).json({ data: item });
  } catch (error: unknown) {
    console.error('Add quote item error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to add quote item';
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// PUT /quotes/:id/items/:itemId - 見積明細更新
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(quoteId) || isNaN(itemId)) return res.status(400).json({ error: 'Invalid ID' });
    const items = await dao.getQuoteItems(quoteId);
    if (!items.find(i => i.id === itemId)) {
      return res.status(404).json({ error: 'Not found', message: 'この見積書に該当する明細が見つかりません' });
    }
    const validation = updateQuoteItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }
    const item = await dao.updateQuoteItem(itemId, validation.data);
    if (!item) return res.status(404).json({ error: 'Not found', message: '明細が見つかりません' });
    res.json({ data: item });
  } catch (error: unknown) {
    console.error('Update quote item error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update quote item';
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// DELETE /quotes/:id/items/:itemId - 見積明細削除
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(quoteId) || isNaN(itemId)) return res.status(400).json({ error: 'Invalid ID' });
    const items = await dao.getQuoteItems(quoteId);
    if (!items.find(i => i.id === itemId)) {
      return res.status(404).json({ error: 'Not found', message: 'この見積書に該当する明細が見つかりません' });
    }
    await dao.deleteQuoteItem(itemId);
    res.status(204).send();
  } catch (error: unknown) {
    console.error('Delete quote item error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to delete quote item' });
  }
});

export default router;
