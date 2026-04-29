import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';

const router = Router();

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
  const { client_id, store_id, car_id, prepayment_amount, items } = req.body as {
    client_id: number;
    store_id: number;
    car_id?: number;
    prepayment_amount: number;
    items: Array<{ product_id: number; quantity: number; price: number }>;
  };

  if (!client_id || !store_id || !items?.length) {
    res.status(400).json({ error: 'Укажите клиента, магазин и товары' });
    return;
  }

  const total_amount = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const amount_due = total_amount - (prepayment_amount || 0);

  const order = await prisma.customerOrder.create({
    data: {
      client_id: Number(client_id),
      store_id: Number(store_id),
      user_id: req.user!.user_id,
      order_status_id: 1,
      car_id: car_id ? Number(car_id) : null,
      total_amount,
      prepayment_amount: prepayment_amount || 0,
      amount_due,
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

  await logAction(req.user!.user_id, 'CREATE', 'customer_orders', order.customer_order_id, `Заказ клиента #${client_id}`);
  res.status(201).json(order);
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { order_status_id } = req.body;
  const order = await prisma.customerOrder.update({
    where: { customer_order_id: id },
    data: { order_status_id: Number(order_status_id) },
    include: { status: true },
  });
  await logAction(req.user!.user_id, 'UPDATE', 'customer_orders', id, `Статус заказа изменён на ${order.status.name}`);
  res.json(order);
});

export default router;
