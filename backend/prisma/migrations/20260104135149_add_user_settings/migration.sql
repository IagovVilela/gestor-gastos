-- CreateTable
CREATE TABLE `user_settings` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `date_format` VARCHAR(191) NOT NULL DEFAULT 'DD/MM/YYYY',
    `number_format` VARCHAR(191) NOT NULL DEFAULT 'pt-BR',
    `first_day_of_week` INTEGER NOT NULL DEFAULT 0,
    `email_notifications` BOOLEAN NOT NULL DEFAULT true,
    `budget_alerts` BOOLEAN NOT NULL DEFAULT true,
    `goal_alerts` BOOLEAN NOT NULL DEFAULT true,
    `recurring_payment_alerts` BOOLEAN NOT NULL DEFAULT true,
    `report_frequency` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `theme` VARCHAR(191) NOT NULL DEFAULT 'system',
    `language` VARCHAR(191) NOT NULL DEFAULT 'pt-BR',
    `session_timeout` INTEGER NOT NULL DEFAULT 30,
    `require_password_for_sensitive_actions` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_settings_user_id_key`(`user_id`),
    INDEX `user_settings_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
