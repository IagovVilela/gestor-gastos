-- AlterTable
ALTER TABLE `credit_card_bills` ADD COLUMN `paid_bank_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `credit_card_bills_paid_bank_id_idx` ON `credit_card_bills`(`paid_bank_id`);

-- AddForeignKey
ALTER TABLE `credit_card_bills` ADD CONSTRAINT `credit_card_bills_paid_bank_id_fkey` FOREIGN KEY (`paid_bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
