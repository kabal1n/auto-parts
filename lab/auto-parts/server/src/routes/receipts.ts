import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';
const upload = multer({ storage: multer.memoryStorage() });

// ── Types ─────────────────────────────────────────────────────────────────────

interface XlsConfig {
  startRow: number;
  article: string;
  name: string;
  barcode: string | null;
  manufacturer: string | null;
  quantity: string;
  purchase_price: string;
  supplierNameCells: string[];
  aliases: string[];
}

interface RawRow {
  article: string | null;
  name: string;
  barcode: string | null;
  manufacturer: string | null;
  quantity: number;
  purchase_price: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseXls(buffer: Buffer, config: XlsConfig): RawRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: RawRow[] = [];
  for (let r = config.startRow; ; r++) {
    const name = ws[`${config.name}${r}`]?.v ? String(ws[`${config.name}${r}`].v) : null;
    if (!name || /^(итог|всего|total)/i.test(name.trim())) break;
    rows.push({
      article:        ws[`${config.article}${r}`]?.v ? String(ws[`${config.article}${r}`].v) : null,
      name:           String(name),
      barcode:        config.barcode && ws[`${config.barcode}${r}`]?.v
                        ? String(ws[`${config.barcode}${r}`].v)
                        : null,
      manufacturer:   config.manufacturer && ws[`${config.manufacturer}${r}`]?.v
                        ? String(ws[`${config.manufacturer}${r}`].v)
                        : null,
      quantity:       Number(ws[`${config.quantity}${r}`]?.v) || 1,
      purchase_price: Number(ws[`${config.purchase_price}${r}`]?.v) || 0,
    });
  }
  return rows;
}

function verifySupplier(buffer: Buffer, config: XlsConfig): boolean {
  if (!config.supplierNameCells?.length || !config.aliases?.length) return true;
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const cellValues = config.supplierNameCells.map((cell) => String(ws[cell]?.v ?? '').toLowerCase());
  return config.aliases.some((alias) =>
    cellValues.some((v) => v.includes(alias.toLowerCase())),
  );
}

function calcSalePrice(purchasePrice: number, markupPercent: unknown): number {
  return Math.round(purchasePrice * (1 + Number(markupPercent ?? 50) / 100));
}

const productCategoryInclude = { category: { select: { markup_percent: true } } } as const;

async function matchProduct(row: RawRow) {
  // 1. By barcode
  if (row.barcode) {
    const p = await prisma.product.findUnique({
      where: { barcode: row.barcode },
      include: productCategoryInclude,
    });
    if (p) return {
      product_id: p.product_id, matchStatus: 'matched',
      sale_price: calcSalePrice(row.purchase_price, p.category?.markup_percent),
    };
  }
  // 2. By article + manufacturer
  if (row.article && row.manufacturer) {
    const p = await prisma.product.findFirst({
      where: {
        article: { equals: row.article, mode: 'insensitive' },
        manufacturer: { is: { name: { equals: row.manufacturer, mode: 'insensitive' } } },
      },
      include: productCategoryInclude,
    });
    if (p) return {
      product_id: p.product_id, matchStatus: 'matched',
      sale_price: calcSalePrice(row.purchase_price, p.category?.markup_percent),
    };
  }
  // 3. By article alone (only if unambiguous)
  if (row.article) {
    const ps = await prisma.product.findMany({
      where: { article: { equals: row.article, mode: 'insensitive' } },
      include: productCategoryInclude,
    });
    if (ps.length === 1) return {
      product_id: ps[0].product_id, matchStatus: 'matched',
      sale_price: calcSalePrice(row.purchase_price, ps[0].category?.markup_percent),
    };
  }
  return { product_id: null, matchStatus: 'pending', sale_price: 0 };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET list (admin) — with optional status filter
router.get('/', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { store_id, status } = req.query as Record<string, string>;
  const receipts = await prisma.goodsReceipt.findMany({
    where: {
      ...(store_id ? { store_id: Number(store_id) } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      user: { select: { last_name: true, first_name: true } },
      store: true,
      supplier: { select: { supplier_id: true, name: true } },
      items: { include: { product: true } },
      issues: { where: { is_resolved: false }, select: { issue_id: true } },
    },
    orderBy: { receipt_datetime: 'desc' },
  });
  res.json(receipts);
});

// GET open issues (admin)
router.get('/issues', requireRole(ADMIN), async (_req: Request, res: Response) => {
  const issues = await prisma.receiptIssue.findMany({
    where: { is_resolved: false },
    include: {
      receipt: { select: { receipt_id: true, receipt_datetime: true } },
      receipt_item: { select: { raw_name: true, raw_article: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  res.json(issues);
});

// PATCH resolve issue (admin)
router.patch('/issues/:issueId/resolve', requireRole(ADMIN), async (req: Request, res: Response) => {
  const issueId = Number(req.params.issueId);
  const issue = await prisma.receiptIssue.update({
    where: { issue_id: issueId },
    data: { is_resolved: true, resolved_at: new Date(), resolved_by_id: req.user!.user_id },
  });
  res.json(issue);
});

// GET detail (admin)
router.get('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { receipt_id: Number(req.params.id) },
    include: {
      user: { select: { last_name: true, first_name: true } },
      store: true,
      supplier: true,
      items: {
        include: {
          product: true,
          issues: true,
        },
      },
      issues: true,
    },
  });
  if (!receipt) { res.status(404).json({ error: 'Поступление не найдено' }); return; }
  res.json(receipt);
});

// POST upload XLS → create DRAFT receipt
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: 'Файл не загружен' }); return; }

  const supplier_id = Number(req.body.supplier_id);
  if (!supplier_id) { res.status(400).json({ error: 'Укажите поставщика' }); return; }

  const supplier = await prisma.supplier.findUnique({ where: { supplier_id } });
  if (!supplier) { res.status(404).json({ error: 'Поставщик не найден' }); return; }

  const config = supplier.xls_config as unknown as XlsConfig;

  // Verify supplier identity in the file
  if (!verifySupplier(file.buffer, config)) {
    res.status(422).json({ error: 'Файл не соответствует выбранному поставщику' });
    return;
  }

  // Determine store_id: admin provides it explicitly, cashier uses their own store
  let store_id: number;
  const isAdmin = req.user!.role === ADMIN;
  if (isAdmin) {
    store_id = Number(req.body.store_id);
    if (!store_id) { res.status(400).json({ error: 'Администратор должен указать магазин' }); return; }
  } else {
    const storeIdFromBody = Number(req.body.store_id);
    if (!storeIdFromBody) { res.status(400).json({ error: 'Магазин не определён' }); return; }
    store_id = storeIdFromBody;
  }

  // Parse XLS rows
  let rows: RawRow[];
  try {
    rows = parseXls(file.buffer, config);
  } catch {
    res.status(422).json({ error: 'Не удалось разобрать файл XLS' });
    return;
  }

  if (!rows.length) {
    res.status(422).json({ error: 'Файл не содержит строк данных' });
    return;
  }

  // Match each row to a product
  const matched = await Promise.all(rows.map(async (row) => {
    const { product_id, matchStatus, sale_price } = await matchProduct(row);
    return { row, product_id, matchStatus, sale_price };
  }));

  // Create receipt in transaction
  const receipt = await prisma.$transaction(async (tx) => {
    const rec = await tx.goodsReceipt.create({
      data: {
        store_id,
        user_id: req.user!.user_id,
        supplier_id,
        file_name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        status: 'DRAFT',
        items: {
          create: matched.map(({ row, product_id, matchStatus, sale_price }) => ({
            product_id: product_id ?? undefined,
            quantity: row.quantity,
            purchase_price: row.purchase_price,
            sale_price,
            match_status: matchStatus,
            raw_article: row.article,
            raw_name: row.name,
            raw_barcode: row.barcode,
            raw_manufacturer: row.manufacturer,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        supplier: true,
        store: true,
      },
    });
    return rec;
  });

  await logAction(req.user!.user_id, 'CREATE', 'goods_receipts', receipt.receipt_id,
    `Загружена накладная: ${Buffer.from(file.originalname, 'latin1').toString('utf8')} (${rows.length} стр.)`);
  res.status(201).json(receipt);
});

// PATCH item — update prices, update_product_price flag
router.patch('/:id/items/:itemId', async (req: Request, res: Response) => {
  const itemId = Number(req.params.itemId);
  const { purchase_price, sale_price, update_product_price } = req.body;
  const item = await prisma.goodsReceiptItem.update({
    where: { receipt_item_id: itemId },
    data: {
      ...(purchase_price !== undefined ? { purchase_price } : {}),
      ...(sale_price !== undefined ? { sale_price } : {}),
      ...(update_product_price !== undefined ? { update_product_price } : {}),
    },
    include: { product: true, issues: true },
  });
  res.json(item);
});

// POST create-product — atomically create product + link item
router.post('/:id/items/:itemId/create-product', async (req: Request, res: Response) => {
  const itemId = Number(req.params.itemId);
  const existing = await prisma.goodsReceiptItem.findUnique({ where: { receipt_item_id: itemId } });
  if (!existing) { res.status(404).json({ error: 'Строка поступления не найдена' }); return; }
  if (existing.product_id) { res.status(409).json({ error: 'Товар уже привязан к этой строке' }); return; }

  const { name, article, barcode, category_id, manufacturer_id, unit_id, purchase_price, sale_price } = req.body;
  if (!name || sale_price === undefined) { res.status(400).json({ error: 'Укажите название и цену продажи' }); return; }

  let resolvedUnitId: number | null = unit_id ? Number(unit_id) : null;
  if (!resolvedUnitId) {
    const sht = await prisma.unit.findFirst({ where: { name: { equals: 'шт', mode: 'insensitive' } } });
    resolvedUnitId = sht?.unit_id ?? null;
  }

  const item = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name,
        article: article || null,
        barcode: barcode || null,
        category_id: category_id ? Number(category_id) : null,
        manufacturer_id: manufacturer_id ? Number(manufacturer_id) : null,
        unit_id: resolvedUnitId,
        price: sale_price,
      },
    });
    await logAction(req.user!.user_id, 'CREATE', 'products', product.product_id,
      `Создан товар из накладной: ${name}`);
    return tx.goodsReceiptItem.update({
      where: { receipt_item_id: itemId },
      data: {
        product_id: product.product_id,
        purchase_price: purchase_price ?? existing.purchase_price,
        sale_price,
        update_product_price: true,
        match_status: 'created',
      },
      include: { product: true, issues: true },
    });
  });

  res.json(item);
});

// POST issue — mark item as problem
router.post('/:id/items/:itemId/issue', async (req: Request, res: Response) => {
  const receiptId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { reason, comment } = req.body;
  if (!reason) { res.status(400).json({ error: 'Укажите причину проблемы' }); return; }

  await prisma.$transaction(async (tx) => {
    await tx.receiptIssue.create({ data: { receipt_id: receiptId, receipt_item_id: itemId, reason, comment } });
    await tx.goodsReceiptItem.update({
      where: { receipt_item_id: itemId },
      data: { match_status: 'issue' },
    });
  });

  const item = await prisma.goodsReceiptItem.findUnique({
    where: { receipt_item_id: itemId },
    include: { issues: true, product: true },
  });
  res.json(item);
});

// PATCH status — transition receipt status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const receiptId = Number(req.params.id);
  const { status } = req.body as { status: string };
  const isAdmin = req.user!.role === ADMIN;

  const receipt = await prisma.goodsReceipt.findUnique({
    where: { receipt_id: receiptId },
    include: { items: true },
  });
  if (!receipt) { res.status(404).json({ error: 'Поступление не найдено' }); return; }

  // Validate transitions
  if (status === 'READY') {
    if (!['DRAFT'].includes(receipt.status)) {
      res.status(400).json({ error: 'Можно перевести в READY только из DRAFT' }); return;
    }
    const hasPending = receipt.items.some((i) => i.match_status === 'pending');
    if (hasPending) {
      res.status(400).json({ error: 'Есть необработанные строки (pending). Обработайте или пометьте как проблему.' }); return;
    }
  } else if (status === 'POSTED') {
    if (!isAdmin) { res.status(403).json({ error: 'Только администратор может провести поступление' }); return; }
    if (receipt.status === 'POSTED') { res.status(409).json({ error: 'Поступление уже проведено' }); return; }
    if (!['READY', 'DRAFT'].includes(receipt.status)) {
      res.status(400).json({ error: 'Нельзя провести поступление в текущем статусе' }); return;
    }
  } else if (status === 'CANCELLED') {
    if (!isAdmin) { res.status(403).json({ error: 'Только администратор может отменить поступление' }); return; }
    if (receipt.status === 'POSTED') { res.status(400).json({ error: 'Нельзя отменить проведённое поступление' }); return; }
  } else {
    res.status(400).json({ error: 'Недопустимый статус' }); return;
  }

  if (status === 'POSTED') {
    await prisma.$transaction(async (tx) => {
      const itemsToPost = receipt.items.filter(
        (i) => i.product_id && ['matched', 'created'].includes(i.match_status),
      );
      for (const item of itemsToPost) {
        await tx.stockByStore.upsert({
          where: { store_id_product_id: { store_id: receipt.store_id, product_id: item.product_id! } },
          create: { store_id: receipt.store_id, product_id: item.product_id!, quantity: item.quantity },
          update: { quantity: { increment: item.quantity } },
        });
        if (item.update_product_price) {
          await tx.product.update({
            where: { product_id: item.product_id! },
            data: { price: item.sale_price },
          });
        }
      }
      await tx.goodsReceipt.update({ where: { receipt_id: receiptId }, data: { status: 'POSTED' } });
    });
    await logAction(req.user!.user_id, 'UPDATE', 'goods_receipts', receiptId, `Поступление проведено`);
  } else {
    await prisma.goodsReceipt.update({ where: { receipt_id: receiptId }, data: { status: status as never } });
  }

  const updated = await prisma.goodsReceipt.findUnique({
    where: { receipt_id: receiptId },
    include: {
      user: { select: { last_name: true, first_name: true } },
      store: true,
      supplier: { select: { supplier_id: true, name: true } },
      items: { include: { product: true, issues: true } },
    },
  });
  res.json(updated);
});

// POST create manual receipt (legacy, keep for compatibility)
router.post('/', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { store_id, note, items } = req.body as {
    store_id: number;
    note?: string;
    items: Array<{ product_id: number; quantity: number; purchase_price: number; sale_price: number }>;
  };

  if (!store_id || !items?.length) {
    res.status(400).json({ error: 'Укажите магазин и товары' });
    return;
  }

  const receipt = await prisma.$transaction(async (tx) => {
    const rec = await tx.goodsReceipt.create({
      data: {
        store_id: Number(store_id),
        user_id: req.user!.user_id,
        note,
        status: 'POSTED',
        items: {
          create: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            purchase_price: i.purchase_price,
            sale_price: i.sale_price,
            match_status: 'matched',
          })),
        },
      },
      include: { items: true },
    });

    for (const item of items) {
      await tx.stockByStore.upsert({
        where: { store_id_product_id: { store_id: Number(store_id), product_id: item.product_id } },
        create: { store_id: Number(store_id), product_id: item.product_id, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
      await tx.product.update({
        where: { product_id: item.product_id },
        data: { price: item.sale_price },
      });
    }
    return rec;
  });

  await logAction(req.user!.user_id, 'CREATE', 'goods_receipts', receipt.receipt_id,
    `Поступление товаров (${items.length} поз.)`);
  res.status(201).json(receipt);
});

export default router;
