import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

const PRODUCT_INCLUDE = { category: true, manufacturer: true, unit: true } as const;

function flattenProduct(p: {
  product_id: number; name: string; article: string | null; barcode: string | null;
  category_id: number | null; manufacturer_id: number | null; unit_id: number | null;
  price: unknown; description: string | null; image_path: string | null;
  created_at: Date; updated_at: Date;
  category: { category_id: number; name: string } | null;
  manufacturer: { manufacturer_id: number; name: string } | null;
  unit: { unit_id: number; name: string } | null;
}) {
  return {
    product_id: p.product_id,
    name: p.name,
    article: p.article,
    barcode: p.barcode,
    category_id: p.category_id,
    category: p.category?.name ?? null,
    manufacturer_id: p.manufacturer_id,
    manufacturer: p.manufacturer?.name ?? null,
    unit_id: p.unit_id,
    unit: p.unit?.name ?? null,
    price: p.price,
    description: p.description,
    image_path: p.image_path,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

router.get('/', async (req: Request, res: Response) => {
  const { search, category_id } = req.query as Record<string, string>;
  const products = await prisma.product.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { article: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
            { category: { is: { name: { contains: search, mode: 'insensitive' } } } },
            { manufacturer: { is: { name: { contains: search, mode: 'insensitive' } } } },
            { unit: { is: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        } : {},
        category_id ? { category_id: Number(category_id) } : {},
      ],
    },
    include: PRODUCT_INCLUDE,
    orderBy: { name: 'asc' },
  });
  res.json(products.map(flattenProduct));
});

router.get('/barcode/:barcode', async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { barcode: String(req.params.barcode) },
    include: PRODUCT_INCLUDE,
  });
  if (!product) { res.status(404).json({ error: 'Товар не найден' }); return; }
  res.json(flattenProduct(product));
});

router.get('/:id', async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { product_id: Number(req.params.id) },
    include: PRODUCT_INCLUDE,
  });
  if (!product) { res.status(404).json({ error: 'Товар не найден' }); return; }
  res.json(flattenProduct(product));
});

router.post('/', async (req: Request, res: Response) => {
  const { name, article, barcode, category_id, manufacturer_id, unit_id, price, description } = req.body;
  if (!name || price === undefined) { res.status(400).json({ error: 'Укажите название и цену' }); return; }

  let resolvedUnitId: number | null = unit_id ? Number(unit_id) : null;
  if (!resolvedUnitId) {
    const sht = await prisma.unit.findFirst({ where: { name: { equals: 'шт', mode: 'insensitive' } } });
    resolvedUnitId = sht?.unit_id ?? null;
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        article: article || null,
        barcode: barcode || null,
        category_id: category_id ? Number(category_id) : null,
        manufacturer_id: manufacturer_id ? Number(manufacturer_id) : null,
        unit_id: resolvedUnitId,
        price,
        description: description || null,
      },
      include: PRODUCT_INCLUDE,
    });
    await logAction(req.user!.user_id, 'CREATE', 'products', product.product_id, `Создан товар: ${name}`);
    res.status(201).json(flattenProduct(product));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: 'Товар с таким штрих-кодом уже существует' });
      return;
    }
    throw e;
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, article, barcode, category_id, manufacturer_id, unit_id, price, description } = req.body;
  const product = await prisma.product.update({
    where: { product_id: id },
    data: {
      name,
      article: article || null,
      barcode: barcode || null,
      category_id: category_id ? Number(category_id) : null,
      manufacturer_id: manufacturer_id ? Number(manufacturer_id) : null,
      unit_id: unit_id ? Number(unit_id) : null,
      price,
      description: description || null,
    },
    include: PRODUCT_INCLUDE,
  });
  await logAction(req.user!.user_id, 'UPDATE', 'products', id, `Обновлён товар: ${name}`);
  res.json(flattenProduct(product));
});

router.delete('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.product.delete({ where: { product_id: id } });
    await logAction(req.user!.user_id, 'DELETE', 'products', id, `Удалён товар #${id}`);
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Нельзя удалить товар: он используется в продажах, заказах или заявках на закупку' });
  }
});

export default router;
