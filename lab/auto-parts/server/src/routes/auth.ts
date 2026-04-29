import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { login, password } = req.body as { login: string; password: string };
  if (!login || !password) {
    res.status(400).json({ error: 'Введите логин и пароль' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { login },
    include: { role: true },
  });

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }

  if (user.account_status === 'BLOCKED') {
    res.status(403).json({ error: 'Учётная запись заблокирована' });
    return;
  }

  const token = jwt.sign(
    { user_id: user.user_id, login: user.login, role: user.role.name },
    process.env.JWT_SECRET!,
    { expiresIn: '12h' },
  );

  res.json({
    token,
    user: {
      user_id: user.user_id,
      login: user.login,
      role: user.role.name,
      last_name: user.last_name,
      first_name: user.first_name,
      middle_name: user.middle_name,
    },
  });
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { user_id: req.user!.user_id },
    include: { role: true },
  });
  if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return; }
  res.json({
    user_id: user.user_id,
    login: user.login,
    role: user.role.name,
    last_name: user.last_name,
    first_name: user.first_name,
    middle_name: user.middle_name,
    account_status: user.account_status,
  });
});

export default router;
