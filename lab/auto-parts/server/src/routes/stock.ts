import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

router.get('/', async (req: Request, res: Response) => {
  const { store_id } = req.query as Record<string, string>;
  const stock = await prisma.stockByStore.findMany({
    where: store_id ? { store_id: Number(store_id) } : {},
    include: { product: true, store: true },
    orderBy: { product: { name: 'asc' } },
  });
  res.json(stock);
});

router.get('/low', async (req: Request, res: Response) => {
  const { store_id } = req.query as Record<string, string>;
  const all = await prisma.stockByStore.findMany({
    where: store_id ? { store_id: Number(store_id) } : {},
    include: { product: true, store: true },
  });
  res.json(all.filter((s) => s.quantity <= s.minimum_quantity));
});

router.put('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { quantity, minimum_quantity } = req.body;
  const entry = await prisma.stockByStore.update({
    where: { stock_id: id },
    data: {
      ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
      ...(minimum_quantity !== undefined ? { minimum_quantity: Number(minimum_quantity) } : {}),
    },
  });
  await logAction(req.user!.user_id, 'UPDATE', 'stock_by_store', id, `Остаток обновлён: кол-во=${quantity}`);
  res.json(entry);
});

// Ensure a stock row exists for product+store
router.post('/ensure', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { store_id, product_id } = req.body;
  const entry = await prisma.stockByStore.upsert({
    where: { store_id_product_id: { store_id: Number(store_id), product_id: Number(product_id) } },
    create: { store_id: Number(store_id), product_id: Number(product_id) },
    update: {},
  });
  res.json(entry);
});

export default router;
