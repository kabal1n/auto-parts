import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

router.get('/', async (req: Request, res: Response) => {
  const { store_id, status } = req.query as Record<string, string>;
  const entries = await prisma.reorderEntry.findMany({
    where: {
      ...(store_id ? { store_id: Number(store_id) } : {}),
      ...(status ? { status: status as 'ACTIVE' | 'PROCESSED' } : {}),
    },
    include: { product: true, store: true, user: { select: { last_name: true, first_name: true } } },
    orderBy: { created_at: 'desc' },
  });
  res.json(entries);
});

router.post('/', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { store_id, product_id, required_quantity, comment } = req.body;
  if (!store_id || !product_id || !required_quantity) {
    res.status(400).json({ error: 'Укажите магазин, товар и количество' });
    return;
  }
  const entry = await prisma.reorderEntry.create({
    data: {
      store_id: Number(store_id),
      product_id: Number(product_id),
      user_id: req.user!.user_id,
      required_quantity: Number(required_quantity),
      comment,
    },
    include: { product: true },
  });
  await logAction(req.user!.user_id, 'CREATE', 'reorder_list', entry.reorder_entry_id, `Заявка на ${entry.product.name}`);
  res.status(201).json(entry);
});

router.patch('/:id/status', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: 'ACTIVE' | 'PROCESSED' };
  const entry = await prisma.reorderEntry.update({
    where: { reorder_entry_id: id },
    data: { status },
  });
  await logAction(req.user!.user_id, 'UPDATE', 'reorder_list', id, `Статус заявки: ${status}`);
  res.json(entry);
});

router.delete('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.reorderEntry.delete({ where: { reorder_entry_id: id } });
  await logAction(req.user!.user_id, 'DELETE', 'reorder_list', id, `Удалена заявка #${id}`);
  res.json({ ok: true });
});

export default router;
