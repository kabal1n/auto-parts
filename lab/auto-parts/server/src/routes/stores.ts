import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  res.json(await prisma.store.findMany({ orderBy: { store_id: 'asc' } }));
});

router.post('/', requireRole('Администратор'), async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  if (!name) { res.status(400).json({ error: 'Укажите название магазина' }); return; }
  const store = await prisma.store.create({ data: { name } });
  await logAction(req.user!.user_id, 'CREATE', 'stores', store.store_id, `Создан магазин: ${name}`);
  res.status(201).json(store);
});

export default router;
