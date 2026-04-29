import prisma from './prisma';

export async function logAction(
  userId: number,
  actionType: string,
  entityName: string,
  entityId?: number,
  description?: string,
) {
  await prisma.actionLog.create({
    data: { user_id: userId, action_type: actionType, entity_name: entityName, entity_id: entityId, description },
  });
}
