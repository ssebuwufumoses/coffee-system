-- AlterTable
ALTER TABLE "dispatches" ADD COLUMN     "driver_phone" VARCHAR(20),
ALTER COLUMN "dispatch_date" SET DATA TYPE TIMESTAMP(3);
