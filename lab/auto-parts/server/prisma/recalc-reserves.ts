import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ISSUED_STATUS_ID = 4;
const CANCELLED_STATUS_ID = 5;

async function main() {
  const stockRows = await prisma.stockByStore.findMany();

  let fixed = 0;
  for (const stock of stockRows) {
    const activeOrderItems = await prisma.customerOrderItem.findMany({
      where: {
        product_id: stock.product_id,
        order: {
          store_id: stock.store_id,
          order_status_id: { notIn: [ISSUED_STATUS_ID, CANCELLED_STATUS_ID] },
        },
      },
      select: { quantity: true },
    });

    const realReserved = activeOrderItems.reduce((sum, i) => sum + i.quantity, 0);

    if (realReserved !== stock.reserved_quantity) {
      console.log(
        `Stock #${stock.stock_id} (product=${stock.product_id}, store=${stock.store_id}): ` +
        `reserved ${stock.reserved_quantity} → ${realReserved} (quantity=${stock.quantity})` +
        (realReserved > stock.quantity ? ' ⚠️  realReserved > quantity (дефицит)' : ''),
      );
      await prisma.stockByStore.update({
        where: { stock_id: stock.stock_id },
        data: { reserved_quantity: realReserved },
      });
      fixed++;
    }
  }

  console.log(`\nИсправлено строк: ${fixed} из ${stockRows.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
