import { PrismaClient, ReorderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── 1. Магазины ──────────────────────────────────────────────────────────
  await prisma.store.upsert({ where: { store_id: 1 }, update: {}, create: { name: 'Магазин №1' } });
  await prisma.store.upsert({ where: { store_id: 2 }, update: {}, create: { name: 'Магазин №2' } });
  console.log('✓ Магазины (2)');

  // ── 2. Пользователи ──────────────────────────────────────────────────────
  const adminRole = await prisma.role.findFirst({ where: { name: 'Администратор' } });
  const cashierRole = await prisma.role.findFirst({ where: { name: 'Кассир' } });
  if (!adminRole || !cashierRole) throw new Error('Роли не найдены — сначала запустите db:seed');

  const adminUser = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      password_hash: await bcrypt.hash('admin123', 10),
      role_id: adminRole.role_id,
      last_name: 'Администратор',
      first_name: 'Системный',
    },
  });

  await prisma.user.upsert({
    where: { login: 'kassir1' },
    update: {},
    create: {
      login: 'kassir1',
      password_hash: await bcrypt.hash('kassir123', 10),
      role_id: cashierRole.role_id,
      last_name: 'Иванов',
      first_name: 'Пётр',
      middle_name: 'Сергеевич',
    },
  });
  console.log('✓ Пользователи (admin + kassir1)');

  // ── 3. Справочники (категории, производители, единицы измерения) ──────────
  const catNames = ['Фильтры', 'Тормозная система', 'Зажигание', 'Двигатель', 'Масла и жидкости', 'Электрика', 'Подвеска'];
  const cats = await Promise.all(
    catNames.map((name) => prisma.category.upsert({ where: { name }, update: {}, create: { name } })),
  );
  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.category_id]));

  const mfrNames = ['MANN-FILTER', 'BOSCH', 'BREMBO', 'NGK', 'Gates', 'Castrol', 'Totachi', 'VARTA', 'KYB', 'DAYCO', 'LEMFÖRDER'];
  const mfrs = await Promise.all(
    mfrNames.map((name) => prisma.manufacturer.upsert({ where: { name }, update: {}, create: { name } })),
  );
  const mfrMap = Object.fromEntries(mfrs.map((m) => [m.name, m.manufacturer_id]));

  const unitSht = await prisma.unit.upsert({ where: { name: 'шт' }, update: {}, create: { name: 'шт' } });
  console.log(`✓ Справочники (${catNames.length} категорий, ${mfrNames.length} производителей, 1 ед.изм.)`);

  // ── 4. Товары ─────────────────────────────────────────────────────────────
  const productsData = [
    { name: 'Масляный фильтр MANN W 712/75',          article: 'W71275',    barcode: '4011558020050', category: 'Фильтры',           manufacturer: 'MANN-FILTER', price: 450 },
    { name: 'Воздушный фильтр MANN C 25 114/1',        article: 'C25114',    barcode: '4011558020067', category: 'Фильтры',           manufacturer: 'MANN-FILTER', price: 680 },
    { name: 'Тормозные колодки BOSCH BP123',           article: 'BP123',     barcode: '4047024000010', category: 'Тормозная система', manufacturer: 'BOSCH',       price: 2100 },
    { name: 'Тормозной диск BREMBO 09.5765.11',        article: 'BD57651',   barcode: '8020584000021', category: 'Тормозная система', manufacturer: 'BREMBO',      price: 3500 },
    { name: 'Свечи зажигания NGK BKR6E (к-т 4 шт)',   article: 'BKR6E4',    barcode: '4022050000030', category: 'Зажигание',         manufacturer: 'NGK',         price: 890 },
    { name: 'Ремень ГРМ Gates T43109',                 article: 'T43109',    barcode: '5414465000041', category: 'Двигатель',         manufacturer: 'Gates',       price: 1450 },
    { name: 'Масло моторное Castrol EDGE 5W-40 4л',    article: 'EDGE5W40',  barcode: '4008177000052', category: 'Масла и жидкости',  manufacturer: 'Castrol',     price: 3200 },
    { name: 'Антифриз Totachi NLL G11 зелёный 5л',     article: 'NLGG5L',    barcode: '4562374000063', category: 'Масла и жидкости',  manufacturer: 'Totachi',     price: 890 },
    { name: 'Аккумулятор VARTA Blue Dynamic 60Ah',     article: 'VB60AH',    barcode: '4016987000074', category: 'Электрика',         manufacturer: 'VARTA',       price: 5800 },
    { name: 'Амортизатор передний KYB 334834',         article: 'KYB334834', barcode: '4030006000085', category: 'Подвеска',          manufacturer: 'KYB',         price: 2800 },
    { name: 'Помпа охлаждения DAYCO DP014',            article: 'DP014',     barcode: '4024780000096', category: 'Двигатель',         manufacturer: 'DAYCO',       price: 1900 },
    { name: 'Рычаг подвески LEMFÖRDER 3401401',        article: 'LF3401401', barcode: '4037762000107', category: 'Подвеска',          manufacturer: 'LEMFÖRDER',   price: 3100 },
  ];

  const products: { product_id: number; price: unknown }[] = [];
  for (const p of productsData) {
    const prod = await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {},
      create: {
        name: p.name,
        article: p.article,
        barcode: p.barcode,
        category_id: catMap[p.category],
        manufacturer_id: mfrMap[p.manufacturer],
        unit_id: unitSht.unit_id,
        price: p.price,
      },
    });
    products.push(prod);
  }
  console.log(`✓ Товары (${products.length})`);

  // ── 5. Клиенты ───────────────────────────────────────────────────────────
  const cs1 = await prisma.customerStatus.findFirst({ where: { name: 'Обычный' } });
  const cs2 = await prisma.customerStatus.findFirst({ where: { name: 'Постоянный' } });
  const cs3 = await prisma.customerStatus.findFirst({ where: { name: 'VIP' } });
  if (!cs1 || !cs2 || !cs3) throw new Error('Статусы клиентов не найдены — сначала запустите db:seed');

  const customersData = [
    { phone: '+79001234567', last_name: 'Петров',    first_name: 'Алексей',  middle_name: 'Иванович',    client_status_id: cs1.client_status_id, personal_discount_percent: 0 },
    { phone: '+79007654321', last_name: 'Смирнова',  first_name: 'Мария',    middle_name: 'Владимировна', client_status_id: cs2.client_status_id, personal_discount_percent: 5 },
    { phone: '+79009998877', last_name: 'Козлов',    first_name: 'Дмитрий',  middle_name: 'Андреевич',   client_status_id: cs3.client_status_id, personal_discount_percent: 10 },
    { phone: '+79003334455', last_name: 'Новикова',  first_name: 'Анна',     middle_name: 'Петровна',    client_status_id: cs1.client_status_id, personal_discount_percent: 0 },
    { phone: '+79006667788', last_name: 'Фёдоров',   first_name: 'Сергей',   middle_name: 'Михайлович',  client_status_id: cs2.client_status_id, personal_discount_percent: 5 },
  ];

  const customers = [];
  for (const c of customersData) {
    customers.push(await prisma.customer.upsert({ where: { phone: c.phone }, update: {}, create: c }));
  }
  const [cPetrov, cSmirnova, cKozlov, cNovikova, cFedorov] = customers;
  console.log(`✓ Клиенты (${customers.length})`);

  // ── 6. Автомобили ────────────────────────────────────────────────────────
  const carDefs = [
    { clientId: cSmirnova.client_id, brand: 'Toyota',        model: 'Camry',    year: 2019, vin: 'XW8ZZZ3BZNG000001' },
    { clientId: cKozlov.client_id,   brand: 'BMW',           model: 'X5',       year: 2021, vin: 'WBAFG410X0LN00001' },
    { clientId: cKozlov.client_id,   brand: 'Mercedes-Benz', model: 'C-Class',  year: 2018, vin: 'WDD2050001R000001' },
    { clientId: cFedorov.client_id,  brand: 'LADA',          model: 'Vesta',    year: 2022, vin: 'XTA21129L00000001' },
  ];

  const carMap: Record<string, number> = {};
  for (const c of carDefs) {
    const key = `${c.clientId}_${c.brand}_${c.model}`;
    const existing = await prisma.car.findFirst({ where: { client_id: c.clientId, car_brand: c.brand, car_model: c.model } });
    const car = existing ?? await prisma.car.create({
      data: { client_id: c.clientId, car_brand: c.brand, car_model: c.model, car_year: c.year, vin: c.vin },
    });
    carMap[key] = car.car_id;
  }
  console.log('✓ Автомобили (4)');

  const camryId  = carMap[`${cSmirnova.client_id}_Toyota_Camry`];
  const bmwId    = carMap[`${cKozlov.client_id}_BMW_X5`];

  // ── 7. Остатки ───────────────────────────────────────────────────────────
  const stock1: [number, number, number][] = [
    [0, 3,  5],  // масляный фильтр  — ДЕФИЦИТ
    [1, 8,  5],  // воздушный фильтр
    [2, 6,  3],  // тормозные колодки
    [3, 4,  2],  // тормозной диск
    [4, 2,  5],  // свечи зажигания  — ДЕФИЦИТ
    [5, 5,  3],  // ремень ГРМ
    [6, 12, 5],  // масло
    [7, 1,  5],  // антифриз         — ДЕФИЦИТ
    [8, 3,  2],  // аккумулятор
    [9, 7,  3],  // амортизатор
    [10, 4, 2],  // помпа
    [11, 2, 2],  // рычаг            — на минимуме
  ];
  for (const [i, qty, min] of stock1) {
    await prisma.stockByStore.upsert({
      where: { store_id_product_id: { store_id: 1, product_id: products[i].product_id } },
      update: {},
      create: { store_id: 1, product_id: products[i].product_id, quantity: qty, minimum_quantity: min },
    });
  }

  const stock2: [number, number, number][] = [
    [0, 5, 3], [2, 3, 2], [4, 6, 3],
    [5, 3, 2], [6, 8, 4], [7, 4, 3], [8, 2, 1],
  ];
  for (const [i, qty, min] of stock2) {
    await prisma.stockByStore.upsert({
      where: { store_id_product_id: { store_id: 2, product_id: products[i].product_id } },
      update: {},
      create: { store_id: 2, product_id: products[i].product_id, quantity: qty, minimum_quantity: min },
    });
  }
  console.log('✓ Остатки (Магазин №1: 12 позиций, Магазин №2: 7 позиций)');

  // ── 8. Продажи ───────────────────────────────────────────────────────────
  const salesCount = await prisma.sale.count();
  if (salesCount === 0) {
    const s1 = await prisma.sale.create({ data: {
      sale_datetime: new Date('2026-04-28T10:30:00'), user_id: adminUser.user_id, store_id: 1,
      client_id: cPetrov.client_id,
      subtotal_amount: 3650, discount_percent: 0, discount_amount: 0, total_amount: 3650,
      cash_amount: 4000, card_amount: 0, change_amount: 350,
    }});
    await prisma.saleItem.createMany({ data: [
      { sale_id: s1.sale_id, product_id: products[0].product_id, quantity: 1, price: 450,  line_amount: 450  },
      { sale_id: s1.sale_id, product_id: products[6].product_id, quantity: 1, price: 3200, line_amount: 3200 },
    ]});

    const s2 = await prisma.sale.create({ data: {
      sale_datetime: new Date('2026-04-28T14:15:00'), user_id: adminUser.user_id, store_id: 1,
      subtotal_amount: 2990, discount_percent: 0, discount_amount: 0, total_amount: 2990,
      cash_amount: 0, card_amount: 2990, change_amount: 0,
    }});
    await prisma.saleItem.createMany({ data: [
      { sale_id: s2.sale_id, product_id: products[2].product_id, quantity: 1, price: 2100, line_amount: 2100 },
      { sale_id: s2.sale_id, product_id: products[4].product_id, quantity: 1, price: 890,  line_amount: 890  },
    ]});

    const s3sub = 5800, s3disc = Math.round(s3sub * 0.05 * 100) / 100;
    const s3 = await prisma.sale.create({ data: {
      sale_datetime: new Date('2026-04-29T09:45:00'), user_id: adminUser.user_id, store_id: 1,
      client_id: cSmirnova.client_id,
      subtotal_amount: s3sub, discount_percent: 5, discount_amount: s3disc, total_amount: s3sub - s3disc,
      cash_amount: 0, card_amount: s3sub - s3disc, change_amount: 0,
    }});
    await prisma.saleItem.createMany({ data: [
      { sale_id: s3.sale_id, product_id: products[8].product_id, quantity: 1, price: 5800, line_amount: 5800 },
    ]});

    const s4sub = 1450 + 1900, s4disc = Math.round(s4sub * 0.10 * 100) / 100, s4total = s4sub - s4disc;
    const s4 = await prisma.sale.create({ data: {
      sale_datetime: new Date('2026-04-29T16:20:00'), user_id: adminUser.user_id, store_id: 1,
      client_id: cKozlov.client_id,
      subtotal_amount: s4sub, discount_percent: 10, discount_amount: s4disc, total_amount: s4total,
      cash_amount: 1500, card_amount: s4total - 1500, change_amount: 0,
    }});
    await prisma.saleItem.createMany({ data: [
      { sale_id: s4.sale_id, product_id: products[5].product_id,  quantity: 1, price: 1450, line_amount: 1450 },
      { sale_id: s4.sale_id, product_id: products[10].product_id, quantity: 1, price: 1900, line_amount: 1900 },
    ]});

    const s5 = await prisma.sale.create({ data: {
      sale_datetime: new Date('2026-04-30T11:00:00'), user_id: adminUser.user_id, store_id: 1,
      subtotal_amount: 2800, discount_percent: 0, discount_amount: 0, total_amount: 2800,
      cash_amount: 3000, card_amount: 0, change_amount: 200,
    }});
    await prisma.saleItem.createMany({ data: [
      { sale_id: s5.sale_id, product_id: products[9].product_id, quantity: 1, price: 2800, line_amount: 2800 },
    ]});

    console.log('✓ Продажи (5)');
  } else {
    console.log(`· Продажи пропущены (уже есть ${salesCount})`);
  }

  // ── 9. Заказы клиентов ───────────────────────────────────────────────────
  const ordersCount = await prisma.customerOrder.count();
  if (ordersCount === 0) {
    const os = await prisma.customerOrderStatus.findMany();
    const byName = Object.fromEntries(os.map((s) => [s.name, s.order_status_id]));

    const o1 = await prisma.customerOrder.create({ data: {
      client_id: cSmirnova.client_id, user_id: adminUser.user_id, store_id: 1,
      order_status_id: byName['В работе'],
      total_amount: 3500, prepayment_amount: 1000, amount_due: 2500,
      car_id: camryId ?? null,
    }});
    await prisma.customerOrderItem.create({ data: {
      customer_order_id: o1.customer_order_id, product_id: products[3].product_id, quantity: 1, price: 3500, line_amount: 3500,
    }});

    const o2 = await prisma.customerOrder.create({ data: {
      client_id: cKozlov.client_id, user_id: adminUser.user_id, store_id: 1,
      order_status_id: byName['Готов к выдаче'],
      total_amount: 3100, prepayment_amount: 3100, amount_due: 0,
      car_id: bmwId ?? null,
    }});
    await prisma.customerOrderItem.create({ data: {
      customer_order_id: o2.customer_order_id, product_id: products[11].product_id, quantity: 1, price: 3100, line_amount: 3100,
    }});

    const o3 = await prisma.customerOrder.create({ data: {
      client_id: cNovikova.client_id, user_id: adminUser.user_id, store_id: 1,
      order_status_id: byName['Новый'],
      total_amount: 5800, prepayment_amount: 0, amount_due: 5800,
    }});
    await prisma.customerOrderItem.create({ data: {
      customer_order_id: o3.customer_order_id, product_id: products[8].product_id, quantity: 1, price: 5800, line_amount: 5800,
    }});

    const o4 = await prisma.customerOrder.create({ data: {
      client_id: cPetrov.client_id, user_id: adminUser.user_id, store_id: 1,
      order_status_id: byName['Выдан'],
      total_amount: 2100, prepayment_amount: 2100, amount_due: 0,
    }});
    await prisma.customerOrderItem.create({ data: {
      customer_order_id: o4.customer_order_id, product_id: products[2].product_id, quantity: 1, price: 2100, line_amount: 2100,
    }});

    console.log('✓ Заказы клиентов (4)');
  } else {
    console.log(`· Заказы пропущены (уже есть ${ordersCount})`);
  }

  // ── 10. Поступления товаров ───────────────────────────────────────────────
  const receiptsCount = await prisma.goodsReceipt.count();
  if (receiptsCount === 0) {
    const r1 = await prisma.goodsReceipt.create({ data: {
      receipt_datetime: new Date('2026-04-25T09:00:00'),
      user_id: adminUser.user_id, store_id: 1,
      note: 'Начальная поставка товара',
    }});
    await prisma.goodsReceiptItem.createMany({ data: products.map((p) => ({
      receipt_id: r1.receipt_id,
      product_id: p.product_id,
      quantity: 20,
      purchase_price: Math.round(Number(p.price) * 0.60 * 100) / 100,
      sale_price: Number(p.price),
    }))});

    const r2 = await prisma.goodsReceipt.create({ data: {
      receipt_datetime: new Date('2026-04-28T08:30:00'),
      user_id: adminUser.user_id, store_id: 1,
      note: 'Дополнительная партия фильтров',
    }});
    await prisma.goodsReceiptItem.createMany({ data: [
      { receipt_id: r2.receipt_id, product_id: products[0].product_id, quantity: 10, purchase_price: 270, sale_price: 450 },
      { receipt_id: r2.receipt_id, product_id: products[1].product_id, quantity: 5,  purchase_price: 408, sale_price: 680 },
    ]});

    const r3 = await prisma.goodsReceipt.create({ data: {
      receipt_datetime: new Date('2026-04-26T10:00:00'),
      user_id: adminUser.user_id, store_id: 2,
      note: 'Начальная поставка для Магазина №2',
    }});
    await prisma.goodsReceiptItem.createMany({ data: [0, 2, 4, 5, 6, 7, 8].map((i) => ({
      receipt_id: r3.receipt_id,
      product_id: products[i].product_id,
      quantity: 10,
      purchase_price: Math.round(Number(products[i].price) * 0.60 * 100) / 100,
      sale_price: Number(products[i].price),
    }))});

    console.log('✓ Поступления товаров (3)');
  } else {
    console.log(`· Поступления пропущены (уже есть ${receiptsCount})`);
  }

  // ── 11. Заявки на закупку ────────────────────────────────────────────────
  const reorderCount = await prisma.reorderRequest.count();
  if (reorderCount === 0) {
    await prisma.reorderRequest.create({ data: {
      store_id: 1, user_id: adminUser.user_id,
      status: ReorderStatus.ACTIVE,
      comment: 'Срочно! Три позиции ниже минимума',
      created_at: new Date('2026-04-29T15:00:00'),
      items: { create: [
        { product_id: products[0].product_id, required_quantity: 20 },
        { product_id: products[7].product_id, required_quantity: 10 },
        { product_id: products[4].product_id, required_quantity: 15 },
      ]},
    }});
    await prisma.reorderRequest.create({ data: {
      store_id: 1, user_id: adminUser.user_id,
      status: ReorderStatus.PROCESSED,
      comment: 'Закуплено, ожидаем поставку',
      created_at: new Date('2026-04-27T10:00:00'),
      items: { create: [
        { product_id: products[5].product_id, required_quantity: 8 },
      ]},
    }});
    console.log('✓ Заявки на закупку (2 заявки, 4 позиции)');
  } else {
    console.log(`· Заявки пропущены (уже есть ${reorderCount})`);
  }

  console.log('\n═══════════════════════════════════');
  console.log('Demo seed завершён!');
  console.log('Логины:  admin / admin123');
  console.log('         kassir1 / kassir123');
  console.log('Магазины: Магазин №1, Магазин №2');
  console.log('═══════════════════════════════════');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
