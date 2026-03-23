-- CreateEnum
CREATE TYPE "UcdaGrade" AS ENUM ('SCREEN_18', 'SCREEN_15', 'SCREEN_12', 'FAQ', 'KIBOKO', 'OTHER');

-- AlterEnum
ALTER TYPE "SaleOrderStatus" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "ucda_grade" "UcdaGrade";

-- AlterTable
ALTER TABLE "farmers" ADD COLUMN     "land_boundary" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
