-- AlterTable
ALTER TABLE "farmers" ADD COLUMN     "bank_account_name" VARCHAR(100),
ADD COLUMN     "bank_account_number" VARCHAR(50),
ADD COLUMN     "bank_branch" VARCHAR(100),
ADD COLUMN     "bank_name" VARCHAR(100),
ADD COLUMN     "mobile_money_network" VARCHAR(10),
ADD COLUMN     "mobile_money_number" VARCHAR(20);
