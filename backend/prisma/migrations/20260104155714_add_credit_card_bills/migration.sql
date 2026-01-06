-- CreateTable
CREATE TABLE `credit_card_bills` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `closing_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `best_purchase_date` DATETIME(3) NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paid_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `is_paid` BOOLEAN NOT NULL DEFAULT false,
    `bank_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `credit_card_bills_user_id_idx`(`user_id`),
    INDEX `credit_card_bills_closing_date_idx`(`closing_date`),
    INDEX `credit_card_bills_due_date_idx`(`due_date`),
    INDEX `credit_card_bills_bank_id_idx`(`bank_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `credit_card_bills` ADD CONSTRAINT `credit_card_bills_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_card_bills` ADD CONSTRAINT `credit_card_bills_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
