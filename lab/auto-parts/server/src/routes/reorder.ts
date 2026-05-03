import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

router.get('/', async (req: Request, res: Response) => {
  const { store_id, status } = req.query as Record<string, string>;
  const requests = await prisma.reorderRequest.findMany({
    where: {
      ...(store_id ? { store_id: Number(store_id) } : {}),
      ...(status ? { status: status as 'ACTIVE' | 'PROCESSED' } : {}),
    },
    include: {
      store: true,
      user: { select: { last_name: true, first_name: true } },
      items: { include: { product: { select: { name: true, article: true } } } },
    },
    orderBy: { created_at: 'desc' },
  });
  res.json(requests);
});

router.post('/', async (req: Request, res: Response) => {
  const { store_id, items, comment } = req.body as {
    store_id: number;
    items: { product_id: number; required_quantity: number }[];
    comment?: string;
  };

  if (!store_id || !items?.length) {
    res.status(400).json({ error: 'Укажите магазин и хотя бы один товар' });
    return;
  }

  const request = await prisma.reorderRequest.create({
    data: {
      store_id: Number(store_id),
      user_id: req.user!.user_id,
      comment,
      items: {
        create: items.map((i) => ({
          product_id: Number(i.product_id),
          required_quantity: Number(i.required_quantity),
        })),
      },
    },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  await logAction(
    req.user!.user_id, 'CREATE', 'reorder_list', request.reorder_request_id,
    `Заявка на закупку: ${request.items.map((i) => i.product.name).join(', ')}`,
  );
  res.status(201).json(request);
});

router.patch('/:id/status', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: 'ACTIVE' | 'PROCESSED' };
  const request = await prisma.reorderRequest.update({
    where: { reorder_request_id: id },
    data: { status },
  });
  await logAction(req.user!.user_id, 'UPDATE', 'reorder_list', id, `Статус заявки: ${status}`);
  res.json(request);
});

router.delete('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.reorderRequest.delete({ where: { reorder_request_id: id } });
  await logAction(req.user!.user_id, 'DELETE', 'reorder_list', id, `Удалена заявка #${id}`);
  res.json({ ok: true });
});

export default router;
