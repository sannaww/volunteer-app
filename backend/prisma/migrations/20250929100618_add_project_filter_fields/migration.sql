-- CreateEnum
CREATE TYPE "public"."ProjectType" AS ENUM ('ECOLOGY', 'ANIMAL_WELFARE', 'EDUCATION', 'SOCIAL', 'CULTURAL', 'SPORTS', 'MEDICAL', 'OTHER');

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "contactInfo" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "projectType" "public"."ProjectType",
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "volunteersRequired" INTEGER NOT NULL DEFAULT 1;
