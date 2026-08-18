ALTER TABLE "public"."Order"
ADD COLUMN "adminArchivedAt" TIMESTAMP(3);

CREATE INDEX "Order_adminArchivedAt_idx"
ON "public"."Order"("adminArchivedAt");
