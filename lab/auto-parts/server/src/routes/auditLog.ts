import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.get('/', requireRole('Администратор'), async (req: Request, res: Response) => {
  const { user_id, entity_name, action_type, from, to, limit = '200' } = req.query as Record<string, string>;
  const logs = await prisma.actionLog.findMany({
    where: {
      ...(user_id ? { user_id: Number(user_id) } : {}),
      ...(entity_name ? { entity_name } : {}),
      ...(action_type ? { action_type } : {}),
      ...(from || to ? {
        event_datetime: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    },
    include: { user: { select: { login: true, last_name: true, first_name: true } } },
    orderBy: { event_datetime: 'desc' },
    take: Number(limit),
  });
  res.json(logs);
});

export default router;
