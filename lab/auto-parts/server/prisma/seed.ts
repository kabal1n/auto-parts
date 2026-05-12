/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Администратор' },
    update: {},
    create: { name: 'Администратор' },
  });
  const cashierRole = await prisma.role.upsert({
    where: { name: 'Кассир' },
    update: {},
    create: { name: 'Кассир' },
  });

  // Default admin user
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      password_hash: hash,
      role_id: adminRole.role_id,
      last_name: 'Администратор',
      first_name: 'Системный',
    },
  });

  // Default store
  await prisma.store.upsert({
    where: { store_id: 1 },
    update: {},
    create: { name: 'Магазин №1' },
  });

  // Customer statuses
  const statuses = [
    { name: 'Обычный', default_discount_percent: 0 },
    { name: 'Постоянный', default_discount_percent: 5 },
    { name: 'VIP', default_discount_percent: 10 },
  ];
  for (const s of statuses) {
    await prisma.customerStatus.upsert({
      where: { client_status_id: statuses.indexOf(s) + 1 },
      update: {},
      create: s,
    });
  }

  // Customer order statuses
  const orderStatuses = ['Новый', 'В работе', 'Готов к выдаче', 'Выдан', 'Отменён'];
  for (let i = 0; i < orderStatuses.length; i++) {
    await prisma.customerOrderStatus.upsert({
      where: { order_status_id: i + 1 },
      update: {},
      create: { name: orderStatuses[i] },
    });
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
