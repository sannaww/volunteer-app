/*
  Warnings:

  - You are about to drop the column `deliveredAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `readAt` on the `Message` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Message_deliveredAt_idx";

-- DropIndex
DROP INDEX "public"."Message_readAt_idx";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "deliveredAt",
DROP COLUMN "readAt";
