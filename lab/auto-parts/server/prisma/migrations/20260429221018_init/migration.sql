-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ReorderStatus" AS ENUM ('ACTIVE', 'PROCESSED');

-- CreateTable
CREATE TABLE "Role" (
    "role_id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "login" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "account_status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role_id" INTEGER NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "log_id" SERIAL NOT NULL,
    "event_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "entity_name" VARCHAR(100) NOT NULL,
    "entity_id" INTEGER,
    "description" TEXT,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "Store" (
    "store_id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("store_id")
);

-- CreateTable
CREATE TABLE "Product" (
    "product_id" SERIAL NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "article" VARCHAR(100),
    "barcode" VARCHAR(50),
    "category" VARCHAR(150),
    "manufacturer" VARCHAR(150),
    "unit" VARCHAR(20) NOT NULL DEFAULT 'шт',
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "image_path" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "StockByStore" (
    "stock_id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minimum_quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockByStore_pkey" PRIMARY KEY ("stock_id")
);

-- CreateTable
CREATE TABLE "CustomerStatus" (
    "client_status_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "default_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerStatus_pkey" PRIMARY KEY ("client_status_id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "client_id" SERIAL NOT NULL,
    "client_status_id" INTEGER NOT NULL,
    "personal_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_name" VARCHAR(100) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "phone" VARCHAR(30) NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "Car" (
    "car_id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "car_brand" VARCHAR(100) NOT NULL,
    "car_model" VARCHAR(100) NOT NULL,
    "car_year" INTEGER,
    "vin" VARCHAR(20),

    CONSTRAINT "Car_pkey" PRIMARY KEY ("car_id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "sale_id" SERIAL NOT NULL,
    "sale_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal_amount" DECIMAL(10,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "cash_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "card_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "change_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "user_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "client_id" INTEGER,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("sale_id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "sale_item_id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "line_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("sale_item_id")
);

-- CreateTable
CREATE TABLE "CustomerOrderStatus" (
    "order_status_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "CustomerOrderStatus_pkey" PRIMARY KEY ("order_status_id")
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "customer_order_id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "prepayment_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "client_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "order_status_id" INTEGER NOT NULL,
    "car_id" INTEGER,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("customer_order_id")
);

-- CreateTable
CREATE TABLE "CustomerOrderItem" (
    "customer_order_item_id" SERIAL NOT NULL,
    "customer_order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "line_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "CustomerOrderItem_pkey" PRIMARY KEY ("customer_order_item_id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "receipt_id" SERIAL NOT NULL,
    "receipt_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "user_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "receipt_item_id" SERIAL NOT NULL,
    "receipt_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchase_price" DECIMAL(10,2) NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("receipt_item_id")
);

-- CreateTable
CREATE TABLE "ReorderEntry" (
    "reorder_entry_id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "required_quantity" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReorderStatus" NOT NULL DEFAULT 'ACTIVE',
    "store_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "ReorderEntry_pkey" PRIMARY KEY ("reorder_entry_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "StockByStore_store_id_product_id_key" ON "StockByStore"("store_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockByStore" ADD CONSTRAINT "StockByStore_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockByStore" ADD CONSTRAINT "StockByStore_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_client_status_id_fkey" FOREIGN KEY ("client_status_id") REFERENCES "CustomerStatus"("client_status_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Customer"("client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Customer"("client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale"("sale_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Customer"("client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_order_status_id_fkey" FOREIGN KEY ("order_status_id") REFERENCES "CustomerOrderStatus"("order_status_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "Car"("car_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_customer_order_id_fkey" FOREIGN KEY ("customer_order_id") REFERENCES "CustomerOrder"("customer_order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "GoodsReceipt"("receipt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderEntry" ADD CONSTRAINT "ReorderEntry_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderEntry" ADD CONSTRAINT "ReorderEntry_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderEntry" ADD CONSTRAINT "ReorderEntry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
