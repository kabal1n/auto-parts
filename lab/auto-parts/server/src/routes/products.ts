import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

router.get('/', async (req: Request, res: Response) => {
  const { search, category } = req.query as Record<string, string>;
  const products = await prisma.product.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { article: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        category ? { category: { equals: category, mode: 'insensitive' } } : {},
      ],
    },
    orderBy: { name: 'asc' },
  });
  res.json(products);
});

router.get('/barcode/:barcode', async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({ where: { barcode: String(req.params.barcode) } });
  if (!product) { res.status(404).json({ error: 'Товар не найден' }); return; }
  res.json(product);
});

router.get('/categories', async (_req: Request, res: Response) => {
  const cats = await prisma.product.findMany({
    select: { category: true },
    distinct: ['category'],
    where: { category: { not: null } },
    orderBy: { category: 'asc' },
  });
  res.json(cats.map((c) => c.category).filter(Boolean));
});

router.get('/:id', async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({ where: { product_id: Number(req.params.id) } });
  if (!product) { res.status(404).json({ error: 'Товар не найден' }); return; }
  res.json(product);
});

router.post('/', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { name, article, barcode, category, manufacturer, unit, price, description } = req.body;
  if (!name || price === undefined) { res.status(400).json({ error: 'Укажите название и цену' }); return; }
  const product = await prisma.product.create({
    data: { name, article, barcode: barcode || null, category, manufacturer, unit: unit || 'шт', price, description },
  });
  await logAction(req.user!.user_id, 'CREATE', 'products', product.product_id, `Создан товар: ${name}`);
  res.status(201).json(product);
});

router.put('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, article, barcode, category, manufacturer, unit, price, description } = req.body;
  const product = await prisma.product.update({
    where: { product_id: id },
    data: { name, article, barcode: barcode || null, category, manufacturer, unit, price, description },
  });
  await logAction(req.user!.user_id, 'UPDATE', 'products', id, `Обновлён товар: ${name}`);
  res.json(product);
});

router.delete('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.product.delete({ where: { product_id: id } });
    await logAction(req.user!.user_id, 'DELETE', 'products', id, `Удалён товар #${id}`);
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      res.status(409).json({ error: 'Нельзя удалить товар: он используется в продажах, заказах или заявках' });
    } else {
      res.status(500).json({ error: 'Ошибка удаления товара' });
    }
  }
});

export default router;
