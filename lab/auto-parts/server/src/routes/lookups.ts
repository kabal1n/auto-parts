import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ── Categories ────────────────────────────────────────────────────────────────

router.get('/categories', async (_req: Request, res: Response) => {
  const rows = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(rows.map((r) => ({ id: r.category_id, name: r.name })));
});

router.post('/categories', async (req: Request, res: Response) => {
  const name = String(req.body.name ?? '').trim();
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) { res.status(200).json({ id: existing.category_id, name: existing.name }); return; }
  const row = await prisma.category.create({ data: { name } });
  res.status(201).json({ id: row.category_id, name: row.name });
});

router.put('/categories/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const name = String(req.body.name ?? '').trim();
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const duplicate = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, NOT: { category_id: id } },
  });
  if (duplicate) { res.status(409).json({ error: 'Категория с таким названием уже существует' }); return; }
  const row = await prisma.category.update({ where: { category_id: id }, data: { name } });
  res.json({ id: row.category_id, name: row.name });
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const count = await prisma.product.count({ where: { category_id: id } });
  if (count > 0) {
    res.status(409).json({ error: `Нельзя удалить: используется в ${count} товар${count === 1 ? 'е' : count < 5 ? 'ах' : 'ах'}` });
    return;
  }
  await prisma.category.delete({ where: { category_id: id } });
  res.json({ ok: true });
});

// ── Manufacturers ─────────────────────────────────────────────────────────────

router.get('/manufacturers', async (_req: Request, res: Response) => {
  const rows = await prisma.manufacturer.findMany({ orderBy: { name: 'asc' } });
  res.json(rows.map((r) => ({ id: r.manufacturer_id, name: r.name })));
});

router.post('/manufacturers', async (req: Request, res: Response) => {
  const name = String(req.body.name ?? '').trim();
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const existing = await prisma.manufacturer.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) { res.status(200).json({ id: existing.manufacturer_id, name: existing.name }); return; }
  const row = await prisma.manufacturer.create({ data: { name } });
  res.status(201).json({ id: row.manufacturer_id, name: row.name });
});

router.put('/manufacturers/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const name = String(req.body.name ?? '').trim();
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const duplicate = await prisma.manufacturer.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, NOT: { manufacturer_id: id } },
  });
  if (duplicate) { res.status(409).json({ error: 'Производитель с таким названием уже существует' }); return; }
  const row = await prisma.manufacturer.update({ where: { manufacturer_id: id }, data: { name } });
  res.json({ id: row.manufacturer_id, name: row.name });
});

router.delete('/manufacturers/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const count = await prisma.product.count({ where: { manufacturer_id: id } });
  if (count > 0) {
    res.status(409).json({ error: `Нельзя удалить: используется в ${count} товар${count === 1 ? 'е' : 'ах'}` });
    return;
  }
  await prisma.manufacturer.delete({ where: { manufacturer_id: id } });
  res.json({ ok: true });
});

// ── Units ─────────────────────────────────────────────────────────────────────

router.get('/units', async (_req: Request, res: Response) => {
  const rows = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
  res.json(rows.map((r) => ({ id: r.unit_id, name: r.name })));
});

router.post('/units', async (req: Request, res: Response) => {
  const name = String(req.body.name ?? '').trim();
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const existing = await prisma.unit.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) { res.status(200).json({ id: existing.unit_id, name: existing.name }); return; }
  const row = await prisma.unit.create({ data: { name } });
  res.status(201).json({ id: row.unit_id, name: row.name });
});

router.put('/units/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const name = String(req.body.name ?? '').trim();
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const duplicate = await prisma.unit.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, NOT: { unit_id: id } },
  });
  if (duplicate) { res.status(409).json({ error: 'Единица измерения с таким названием уже существует' }); return; }
  const row = await prisma.unit.update({ where: { unit_id: id }, data: { name } });
  res.json({ id: row.unit_id, name: row.name });
});

router.delete('/units/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const count = await prisma.product.count({ where: { unit_id: id } });
  if (count > 0) {
    res.status(409).json({ error: `Нельзя удалить: используется в ${count} товар${count === 1 ? 'е' : 'ах'}` });
    return;
  }
  await prisma.unit.delete({ where: { unit_id: id } });
  res.json({ ok: true });
});

export default router;
