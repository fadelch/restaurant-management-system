-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "customerAddress" TEXT,
ADD COLUMN     "mapLocation" TEXT,
ADD COLUMN     "paymentCode" TEXT,
ADD COLUMN     "paymentMethod" TEXT;
