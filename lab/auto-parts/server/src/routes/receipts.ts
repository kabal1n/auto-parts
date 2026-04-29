import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

router.get('/', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { store_id } = req.query as Record<string, string>;
  const receipts = await prisma.goodsReceipt.findMany({
    where: store_id ? { store_id: Number(store_id) } : {},
    include: {
      user: { select: { last_name: true, first_name: true } },
      store: true,
      items: { include: { product: true } },
    },
    orderBy: { receipt_datetime: 'desc' },
  });
  res.json(receipts);
});

router.get('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { receipt_id: Number(req.params.id) },
    include: { items: { include: { product: true } }, user: true, store: true },
  });
  if (!receipt) { res.status(404).json({ error: 'Поступление не найдено' }); return; }
  res.json(receipt);
});

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
        items: {
          create: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            purchase_price: i.purchase_price,
            sale_price: i.sale_price,
          })),
        },
      },
      include: { items: true },
    });

    // Update stock and product price
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

  await logAction(req.user!.user_id, 'CREATE', 'goods_receipts', receipt.receipt_id, `Поступление товаров (${items.length} поз.)`);
  res.status(201).json(receipt);
});

export default router;
