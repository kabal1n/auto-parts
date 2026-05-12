import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { from, to, store_id } = req.query as Record<string, string>;
  const sales = await prisma.sale.findMany({
    where: {
      ...(store_id ? { store_id: Number(store_id) } : {}),
      ...(from || to ? {
        sale_datetime: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    },
    include: {
      user: { select: { last_name: true, first_name: true } },
      customer: { select: { last_name: true, first_name: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { sale_datetime: 'desc' },
  });
  res.json(sales);
});

router.get('/:id', async (req: Request, res: Response) => {
  const sale = await prisma.sale.findUnique({
    where: { sale_id: Number(req.params.id) },
    include: {
      user: true,
      customer: true,
      items: { include: { product: true } },
    },
  });
  if (!sale) { res.status(404).json({ error: 'Продажа не найдена' }); return; }
  res.json(sale);
});

router.post('/', async (req: Request, res: Response) => {
  const {
    store_id, client_id,
    discount_percent, cash_amount, card_amount,
    items,
  } = req.body as {
    store_id: number;
    client_id?: number;
    discount_percent: number;
    cash_amount: number;
    card_amount: number;
    items: Array<{ product_id: number; quantity: number; price: number }>;
  };

  if (!items?.length) { res.status(400).json({ error: 'Корзина пуста' }); return; }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const discount_amount = subtotal * (discount_percent / 100);
  const total_amount = subtotal - discount_amount;
  const change_amount = Math.max(0, cash_amount + card_amount - total_amount);

  const sale = await prisma.$transaction(async (tx) => {
    // Validate and deduct stock
    for (const item of items) {
      const stock = await tx.stockByStore.findUnique({
        where: { store_id_product_id: { store_id: Number(store_id), product_id: item.product_id } },
      });
      const available = stock ? stock.quantity - stock.reserved_quantity : 0;
      if (!stock || available < item.quantity) {
        const label = item.product_id;
        throw new Error(`Недостаточно товара #${label} на складе (доступно: ${available})`);
      }
      await tx.stockByStore.update({
        where: { stock_id: stock.stock_id },
        data: { quantity: stock.quantity - item.quantity },
      });
    }

    return tx.sale.create({
      data: {
        store_id: Number(store_id),
        user_id: req.user!.user_id,
        client_id: client_id ? Number(client_id) : null,
        subtotal_amount: subtotal,
        discount_percent: discount_percent || 0,
        discount_amount,
        total_amount,
        cash_amount: cash_amount || 0,
        card_amount: card_amount || 0,
        change_amount,
        items: {
          create: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            price: i.price,
            line_amount: i.quantity * i.price,
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });
  });

  await logAction(req.user!.user_id, 'CREATE', 'sales', sale.sale_id, `Продажа на сумму ${total_amount}`);
  res.status(201).json(sale);
});

export default router;
