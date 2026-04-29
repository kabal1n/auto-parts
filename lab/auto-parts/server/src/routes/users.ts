import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { logAction } from '../lib/audit';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const ADMIN = 'Администратор';

router.get('/', requireRole(ADMIN), async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { last_name: 'asc' },
  });
  res.json(users.map((u) => ({
    user_id: u.user_id,
    login: u.login,
    role: u.role.name,
    role_id: u.role_id,
    last_name: u.last_name,
    first_name: u.first_name,
    middle_name: u.middle_name,
    account_status: u.account_status,
    created_at: u.created_at,
  })));
});

router.post('/', requireRole(ADMIN), async (req: Request, res: Response) => {
  const { login, password, role_id, last_name, first_name, middle_name } = req.body;
  if (!login || !password || !role_id || !last_name || !first_name) {
    res.status(400).json({ error: 'Заполните все обязательные поля' });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { login, password_hash: hash, role_id: Number(role_id), last_name, first_name, middle_name },
  });
  await logAction(req.user!.user_id, 'CREATE', 'users', user.user_id, `Создан пользователь ${login}`);
  res.status(201).json({ user_id: user.user_id });
});

router.put('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { role_id, last_name, first_name, middle_name, account_status, password } = req.body;
  const data: Record<string, unknown> = { role_id: Number(role_id), last_name, first_name, middle_name, account_status };
  if (password) data.password_hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { user_id: id }, data });
  await logAction(req.user!.user_id, 'UPDATE', 'users', id, `Обновлён пользователь #${id}`);
  res.json({ ok: true });
});

router.delete('/:id', requireRole(ADMIN), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (id === req.user!.user_id) { res.status(400).json({ error: 'Нельзя удалить самого себя' }); return; }
  await prisma.user.delete({ where: { user_id: id } });
  await logAction(req.user!.user_id, 'DELETE', 'users', id, `Удалён пользователь #${id}`);
  res.json({ ok: true });
});

router.get('/roles', requireRole(ADMIN), async (_req: Request, res: Response) => {
  res.json(await prisma.role.findMany());
});

export default router;
