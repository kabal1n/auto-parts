import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';

const router = Router();

router.get('/statuses', async (_req: Request, res: Response) => {
  res.json(await prisma.customerStatus.findMany({ orderBy: { client_status_id: 'asc' } }));
});

router.get('/', async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const customers = await prisma.customer.findMany({
    where: search ? {
      OR: [
        { phone: { contains: search } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { first_name: { contains: search, mode: 'insensitive' } },
      ],
    } : {},
    include: { status: true, cars: true },
    orderBy: { last_name: 'asc' },
  });
  res.json(customers);
});

router.get('/:id', async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { client_id: Number(req.params.id) },
    include: { status: true, cars: true },
  });
  if (!customer) { res.status(404).json({ error: 'Клиент не найден' }); return; }
  res.json(customer);
});

router.get('/phone/:phone', async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { phone: String(req.params.phone) },
    include: { status: true, cars: true },
  });
  if (!customer) { res.status(404).json({ error: 'Клиент не найден' }); return; }
  res.json(customer);
});

router.post('/', async (req: Request, res: Response) => {
  const { client_status_id, personal_discount_percent, last_name, first_name, middle_name, phone, comment } = req.body;
  if (!last_name || !first_name || !phone) {
    res.status(400).json({ error: 'Фамилия, имя и телефон обязательны' });
    return;
  }
  const customer = await prisma.customer.create({
    data: {
      client_status_id: Number(client_status_id) || 1,
      personal_discount_percent: personal_discount_percent || 0,
      last_name, first_name, middle_name, phone, comment,
    },
  });
  await logAction(req.user!.user_id, 'CREATE', 'customers', customer.client_id, `Создан клиент: ${last_name} ${phone}`);
  res.status(201).json(customer);
});

router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { client_status_id, personal_discount_percent, last_name, first_name, middle_name, phone, comment } = req.body;
  const customer = await prisma.customer.update({
    where: { client_id: id },
    data: { client_status_id: Number(client_status_id), personal_discount_percent, last_name, first_name, middle_name, phone, comment },
  });
  await logAction(req.user!.user_id, 'UPDATE', 'customers', id, `Обновлён клиент #${id}`);
  res.json(customer);
});

// Cars
router.post('/:id/cars', async (req: Request, res: Response) => {
  const { car_brand, car_model, car_year, vin } = req.body;
  const car = await prisma.car.create({
    data: { client_id: Number(req.params.id), car_brand, car_model, car_year: car_year ? Number(car_year) : null, vin },
  });
  res.status(201).json(car);
});

router.put('/cars/:car_id', async (req: Request, res: Response) => {
  const { car_brand, car_model, car_year, vin } = req.body;
  const car = await prisma.car.update({
    where: { car_id: Number(req.params.car_id) },
    data: { car_brand, car_model, car_year: car_year ? Number(car_year) : null, vin },
  });
  res.json(car);
});

router.delete('/cars/:car_id', async (req: Request, res: Response) => {
  await prisma.car.delete({ where: { car_id: Number(req.params.car_id) } });
  res.json({ ok: true });
});

export default router;
