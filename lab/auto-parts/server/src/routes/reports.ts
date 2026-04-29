import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

// Sales summary by period
router.get('/sales', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { from, to, store_id } = req.query as Record<string, string>;
  const sales = await prisma.sale.findMany({
    where: {
      ...(store_id ? { store_id: Number(store_id) } : {}),
      sale_datetime: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    },
    include: { items: { include: { product: true } } },
  });

  const totals = {
    count: sales.length,
    subtotal: sales.reduce((s, x) => s + Number(x.subtotal_amount), 0),
    discount: sales.reduce((s, x) => s + Number(x.discount_amount), 0),
    total: sales.reduce((s, x) => s + Number(x.total_amount), 0),
    cash: sales.reduce((s, x) => s + Number(x.cash_amount), 0),
    card: sales.reduce((s, x) => s + Number(x.card_amount), 0),
  };

  // Top products
  const productMap = new Map<number, { name: string; qty: number; amount: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = productMap.get(item.product_id) ?? { name: item.product.name, qty: 0, amount: 0 };
      productMap.set(item.product_id, {
        name: existing.name,
        qty: existing.qty + item.quantity,
        amount: existing.amount + Number(item.line_amount),
      });
    }
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 20);

  res.json({ totals, topProducts, sales });
});

// Stock status
router.get('/stock', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { store_id } = req.query as Record<string, string>;
  const stock = await prisma.stockByStore.findMany({
    where: store_id ? { store_id: Number(store_id) } : {},
    include: { product: true, store: true },
    orderBy: { product: { name: 'asc' } },
  });
  res.json(stock);
});

// Excel export for sales report
router.get('/sales/export', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { from, to, store_id } = req.query as Record<string, string>;
  const sales = await prisma.sale.findMany({
    where: {
      ...(store_id ? { store_id: Number(store_id) } : {}),
      sale_datetime: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    },
    include: {
      items: { include: { product: true } },
      user: { select: { last_name: true, first_name: true } },
      customer: { select: { last_name: true, first_name: true, phone: true } },
    },
    orderBy: { sale_datetime: 'asc' },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Продажи');
  ws.columns = [
    { header: '№', key: 'id', width: 8 },
    { header: 'Дата', key: 'date', width: 20 },
    { header: 'Кассир', key: 'cashier', width: 25 },
    { header: 'Клиент', key: 'customer', width: 25 },
    { header: 'Сумма', key: 'total', width: 14 },
    { header: 'Скидка', key: 'discount', width: 14 },
    { header: 'Итого', key: 'net', width: 14 },
    { header: 'Наличные', key: 'cash', width: 14 },
    { header: 'Карта', key: 'card', width: 14 },
  ];
  for (const s of sales) {
    ws.addRow({
      id: s.sale_id,
      date: s.sale_datetime.toLocaleString('ru-RU'),
      cashier: `${s.user.last_name} ${s.user.first_name}`,
      customer: s.customer ? `${s.customer.last_name} ${s.customer.phone}` : '',
      total: Number(s.subtotal_amount),
      discount: Number(s.discount_amount),
      net: Number(s.total_amount),
      cash: Number(s.cash_amount),
      card: Number(s.card_amount),
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="sales.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

export default router;
