-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_deliveredAt_idx" ON "Message"("deliveredAt");

-- CreateIndex
CREATE INDEX "Message_readAt_idx" ON "Message"("readAt");
