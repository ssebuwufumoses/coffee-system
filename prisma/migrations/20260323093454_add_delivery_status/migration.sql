-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'MILLED');

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING';
