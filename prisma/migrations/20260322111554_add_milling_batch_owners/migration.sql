-- CreateEnum
CREATE TYPE "MillingBatchType" AS ENUM ('INDIVIDUAL', 'GROUP');

-- AlterTable
ALTER TABLE "milling_batches" ADD COLUMN     "batch_type" "MillingBatchType" NOT NULL DEFAULT 'INDIVIDUAL';

-- CreateTable
CREATE TABLE "milling_batch_owners" (
    "id" TEXT NOT NULL,
    "milling_batch_id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "input_kg" DECIMAL(10,2) NOT NULL,
    "output_beans_kg" DECIMAL(10,2),
    "output_husks_kg" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milling_batch_owners_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "milling_batch_owners" ADD CONSTRAINT "milling_batch_owners_milling_batch_id_fkey" FOREIGN KEY ("milling_batch_id") REFERENCES "milling_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milling_batch_owners" ADD CONSTRAINT "milling_batch_owners_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
