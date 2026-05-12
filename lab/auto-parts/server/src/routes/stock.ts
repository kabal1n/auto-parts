import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

const PRODUCT_INCLUDE = { category: true, manufacturer: true, unit: true } as const;

function flattenStockProduct(p: {
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
  const { store_id } = req.query as Record<string, string>;
  const stock = await prisma.stockByStore.findMany({
    where: store_id ? { store_id: Number(store_id) } : {},
    include: { product: { include: PRODUCT_INCLUDE }, store: true },
    orderBy: { product: { name: 'asc' } },
  });
  res.json(stock.map((s) => ({
    ...s,
    available_quantity: Math.max(0, s.quantity - s.reserved_quantity),
    product: flattenStockProduct(s.product),
  })));
});

router.get('/low', async (req: Request, res: Response) => {
  const { store_id } = req.query as Record<string, string>;
  const all = await prisma.stockByStore.findMany({
    where: store_id ? { store_id: Number(store_id) } : {},
    include: { product: { include: PRODUCT_INCLUDE }, store: true },
  });
  const flattened = all.map((s) => ({
    ...s,
    available_quantity: Math.max(0, s.quantity - s.reserved_quantity),
    product: flattenStockProduct(s.product),
  }));
  res.json(flattened.filter((s) => s.quantity <= s.minimum_quantity));
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
