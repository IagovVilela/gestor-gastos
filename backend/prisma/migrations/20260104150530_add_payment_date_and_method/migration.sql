-- AlterTable
ALTER TABLE `expenses` ADD COLUMN `payment_date` DATETIME(3) NULL,
    ADD COLUMN `payment_method` ENUM('CREDIT', 'DEBIT', 'CASH', 'PIX', 'BANK_TRANSFER', 'OTHER') NULL;

-- CreateIndex
CREATE INDEX `expenses_payment_date_idx` ON `expenses`(`payment_date`);

-- CreateIndex
CREATE INDEX `expenses_payment_method_idx` ON `expenses`(`payment_method`);
