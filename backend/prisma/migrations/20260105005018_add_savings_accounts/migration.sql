-- CreateTable
CREATE TABLE `savings_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `current_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `target_amount` DECIMAL(10, 2) NULL,
    `bank_id` VARCHAR(191) NULL,
    `goal_id` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `savings_accounts_goal_id_key`(`goal_id`),
    INDEX `savings_accounts_user_id_idx`(`user_id`),
    INDEX `savings_accounts_bank_id_idx`(`bank_id`),
    INDEX `savings_accounts_goal_id_idx`(`goal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `savings_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `savings_account_id` VARCHAR(191) NOT NULL,
    `type` ENUM('DEPOSIT', 'WITHDRAWAL') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` TEXT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bank_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `savings_transactions_savings_account_id_idx`(`savings_account_id`),
    INDEX `savings_transactions_user_id_idx`(`user_id`),
    INDEX `savings_transactions_date_idx`(`date`),
    INDEX `savings_transactions_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `savings_accounts` ADD CONSTRAINT `savings_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `savings_accounts` ADD CONSTRAINT `savings_accounts_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `savings_accounts` ADD CONSTRAINT `savings_accounts_goal_id_fkey` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `savings_transactions` ADD CONSTRAINT `savings_transactions_savings_account_id_fkey` FOREIGN KEY (`savings_account_id`) REFERENCES `savings_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `savings_transactions` ADD CONSTRAINT `savings_transactions_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `savings_transactions` ADD CONSTRAINT `savings_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
