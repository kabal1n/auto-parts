import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

router.get('/', async (_req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  res.json(suppliers);
});

router.post('/', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { name, xls_config } = req.body;
  if (!name) { res.status(400).json({ error: 'Укажите название поставщика' }); return; }
  const supplier = await prisma.supplier.create({ data: { name, xls_config: xls_config ?? {} } });
  res.status(201).json(supplier);
});

router.put('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, xls_config } = req.body;
  const supplier = await prisma.supplier.update({ where: { supplier_id: id }, data: { name, xls_config } });
  res.json(supplier);
});

router.delete('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const count = await prisma.goodsReceipt.count({ where: { supplier_id: id } });
  if (count > 0) {
    res.status(409).json({ error: `Нельзя удалить: используется в ${count} поступлениях` });
    return;
  }
  await prisma.supplier.delete({ where: { supplier_id: id } });
  res.json({ ok: true });
});

export default router;
