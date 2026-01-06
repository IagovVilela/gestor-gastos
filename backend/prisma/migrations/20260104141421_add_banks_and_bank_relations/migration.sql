-- AlterTable
ALTER TABLE `expenses` ADD COLUMN `bank_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `receipts` ADD COLUMN `bank_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `banks` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `color` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `banks_user_id_idx`(`user_id`),
    INDEX `banks_is_primary_idx`(`is_primary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `expenses_bank_id_idx` ON `expenses`(`bank_id`);

-- CreateIndex
CREATE INDEX `receipts_bank_id_idx` ON `receipts`(`bank_id`);

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `banks` ADD CONSTRAINT `banks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
