-- CreateIndex
CREATE INDEX `expenses_paid_bank_id_idx` ON `expenses`(`paid_bank_id`);

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_paid_bank_id_fkey` FOREIGN KEY (`paid_bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
