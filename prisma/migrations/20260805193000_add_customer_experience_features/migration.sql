-- AlterTable
ALTER TABLE "public"."Order"
ADD COLUMN     "orderNumber" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "fulfillmentType" TEXT NOT NULL DEFAULT 'delivery',
ADD COLUMN     "orderNotes" TEXT,
ADD COLUMN     "estimatedReadyAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."Favorite" (
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId", "foodId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "public"."Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Favorite_foodId_idx" ON "public"."Favorite"("foodId");

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;
