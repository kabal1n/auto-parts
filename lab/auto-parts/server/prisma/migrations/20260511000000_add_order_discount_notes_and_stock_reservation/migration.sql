-- AlterTable: add reservation field to StockByStore
ALTER TABLE "StockByStore" ADD COLUMN "reserved_quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: add discount, notes, expected_date fields to CustomerOrder
ALTER TABLE "CustomerOrder" ADD COLUMN "subtotal_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "CustomerOrder" ADD COLUMN "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "CustomerOrder" ADD COLUMN "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "CustomerOrder" ADD COLUMN "expected_date" DATE;
ALTER TABLE "CustomerOrder" ADD COLUMN "notes" TEXT;

-- Backfill subtotal_amount from existing total_amount (no discount was applied before)
UPDATE "CustomerOrder" SET "subtotal_amount" = "total_amount";
