import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';

const router = Router();

const STATUS = {
  NEW: 1,
  IN_PROGRESS: 2,
  READY: 3,
  ISSUED: 4,
  CANCELLED: 5,
} as const;

router.get('/', async (req: Request, res: Response) => {
  const { store_id, status_id } = req.query as Record<string, string>;
  const orders = await prisma.customerOrder.findMany({
    where: {
      ...(store_id ? { store_id: Number(store_id) } : {}),
      ...(status_id ? { order_status_id: Number(status_id) } : {}),
    },
    include: {
      customer: { select: { last_name: true, first_name: true, phone: true } },
      status: true,
      user: { select: { last_name: true, first_name: true } },
      car: true,
    },
    orderBy: { created_at: 'desc' },
  });
  res.json(orders);
});

router.get('/statuses', async (_req: Request, res: Response) => {
  res.json(await prisma.customerOrderStatus.findMany());
});

router.get('/:id', async (req: Request, res: Response) => {
  const order = await prisma.customerOrder.findUnique({
    where: { customer_order_id: Number(req.params.id) },
    include: {
      customer: true,
      status: true,
      user: true,
      car: true,
      items: { include: { product: true } },
    },
  });
  if (!order) { res.status(404).json({ error: 'Заказ не найден' }); return; }
  res.json(order);
});

router.post('/', async (req: Request, res: Response) => {
  const { client_id, store_id, car_id, prepayment_amount, discount_percent, expected_date, notes, items } = req.body as {
    client_id: number;
    store_id: number;
    car_id?: number;
    prepayment_amount?: number;
    discount_percent?: number;
    expected_date?: string | null;
    notes?: string | null;
    items: Array<{ product_id: number; quantity: number; price: number }>;
  };

  if (!client_id || !store_id || !items?.length) {
    res.status(400).json({ error: 'Укажите клиента, магазин и товары' });
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { client_id: Number(client_id) } });
  if (!customer) { res.status(404).json({ error: 'Клиент не найден' }); return; }

  const appliedDiscount = discount_percent !== undefined ? Number(discount_percent) : Number(customer.personal_discount_percent);
  const prepayment = Number(prepayment_amount) || 0;

  const subtotal_amount = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const discount_amount = subtotal_amount * (appliedDiscount / 100);
  const total_amount = subtotal_amount - discount_amount;
  const amount_due = Math.max(0, total_amount - prepayment);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.customerOrder.create({
      data: {
        client_id: Number(client_id),
        store_id: Number(store_id),
        user_id: req.user!.user_id,
        order_status_id: STATUS.NEW,
        car_id: car_id ? Number(car_id) : null,
        subtotal_amount,
        discount_percent: appliedDiscount,
        discount_amount,
        total_amount,
        prepayment_amount: prepayment,
        amount_due,
        expected_date: expected_date ? new Date(expected_date) : null,
        notes: notes || null,
        items: {
          create: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            price: i.price,
            line_amount: i.quantity * i.price,
          })),
        },
      },
      include: { items: true, customer: true, status: true },
    });

    for (const item of items) {
      await tx.stockByStore.upsert({
        where: { store_id_product_id: { store_id: Number(store_id), product_id: item.product_id } },
        update: { reserved_quantity: { increment: item.quantity } },
        create: { store_id: Number(store_id), product_id: item.product_id, quantity: 0, reserved_quantity: item.quantity },
      });
    }

    return created;
  });

  await logAction(req.user!.user_id, 'CREATE', 'customer_orders', order.customer_order_id, `Заказ клиента #${client_id}`);
  res.status(201).json(order);
});

router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { expected_date, notes } = req.body as { expected_date?: string | null; notes?: string | null };

  const existing = await prisma.customerOrder.findUnique({ where: { customer_order_id: id } });
  if (!existing) { res.status(404).json({ error: 'Заказ не найден' }); return; }
  if (existing.order_status_id === STATUS.ISSUED || existing.order_status_id === STATUS.CANCELLED) {
    res.status(409).json({ error: 'Нельзя редактировать выданный или отменённый заказ' });
    return;
  }

  const order = await prisma.customerOrder.update({
    where: { customer_order_id: id },
    data: {
      expected_date: expected_date !== undefined ? (expected_date ? new Date(expected_date) : null) : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
  });
  res.json(order);
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const newStatusId = Number(req.body.order_status_id);

  const existing = await prisma.customerOrder.findUnique({
    where: { customer_order_id: id },
    include: { items: true },
  });
  if (!existing) { res.status(404).json({ error: 'Заказ не найден' }); return; }
  if (existing.order_status_id === STATUS.ISSUED) {
    res.status(409).json({ error: 'Выданный заказ нельзя изменить' });
    return;
  }
  if (existing.order_status_id === STATUS.CANCELLED) {
    res.status(409).json({ error: 'Заказ уже отменён' });
    return;
  }

  const order = await prisma.$transaction(async (tx) => {
    if (newStatusId === STATUS.CANCELLED) {
      for (const item of existing.items) {
        const stock = await tx.stockByStore.findUnique({
          where: { store_id_product_id: { store_id: existing.store_id, product_id: item.product_id } },
        });
        if (stock) {
          const safeDecrement = Math.min(item.quantity, stock.reserved_quantity);
          await tx.stockByStore.update({
            where: { stock_id: stock.stock_id },
            data: { reserved_quantity: { decrement: safeDecrement } },
          });
        }
      }
    }

    return tx.customerOrder.update({
      where: { customer_order_id: id },
      data: { order_status_id: newStatusId },
      include: { status: true },
    });
  });

  await logAction(req.user!.user_id, 'UPDATE', 'customer_orders', id, `Статус заказа изменён на ${order.status.name}`);
  res.json(order);
});

router.post('/:id/checkout', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { cash_amount, card_amount } = req.body as { cash_amount: number; card_amount: number };

  const existing = await prisma.customerOrder.findUnique({
    where: { customer_order_id: id },
    include: { items: { include: { product: true } } },
  });
  if (!existing) { res.status(404).json({ error: 'Заказ не найден' }); return; }
  if (existing.order_status_id === STATUS.ISSUED) {
    res.status(409).json({ error: 'Заказ уже выдан' });
    return;
  }
  if (existing.order_status_id === STATUS.CANCELLED) {
    res.status(409).json({ error: 'Отменённый заказ нельзя оформить' });
    return;
  }

  const amountDue = Number(existing.amount_due);
  if ((Number(cash_amount) || 0) + (Number(card_amount) || 0) < amountDue) {
    res.status(400).json({ error: 'Сумма оплаты меньше остатка к оплате' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        const stock = await tx.stockByStore.findUnique({
          where: { store_id_product_id: { store_id: existing.store_id, product_id: item.product_id } },
        });
        if (!stock || stock.quantity < item.quantity) {
          const label = item.product?.name ?? `#${item.product_id}`;
          throw new Error(`Недостаточно товара «${label}» на складе`);
        }
        const safeReserveDecrement = Math.min(item.quantity, stock.reserved_quantity);
        await tx.stockByStore.update({
          where: { stock_id: stock.stock_id },
          data: {
            quantity: { decrement: item.quantity },
            reserved_quantity: { decrement: safeReserveDecrement },
          },
        });
      }

      const sale = await tx.sale.create({
        data: {
          store_id: existing.store_id,
          user_id: req.user!.user_id,
          client_id: existing.client_id,
          subtotal_amount: existing.subtotal_amount,
          discount_percent: existing.discount_percent,
          discount_amount: existing.discount_amount,
          total_amount: existing.total_amount,
          cash_amount: Number(cash_amount) || 0,
          card_amount: Number(card_amount) || 0,
          change_amount: Math.max(0, (Number(cash_amount) || 0) + (Number(card_amount) || 0) - amountDue),
          items: {
            create: existing.items.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
              price: i.price,
              line_amount: i.line_amount,
            })),
          },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      const updatedOrder = await tx.customerOrder.update({
        where: { customer_order_id: id },
        data: { order_status_id: STATUS.ISSUED, amount_due: 0 },
        include: { status: true, customer: true, items: { include: { product: true } } },
      });

      return { sale, order: updatedOrder };
    });

    await logAction(req.user!.user_id, 'CREATE', 'sales', result.sale.sale_id, `Продажа из заказа #${id} на сумму ${existing.total_amount}`);
    res.status(201).json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Ошибка оформления продажи';
    res.status(400).json({ error: msg });
  }
});

export default router;
