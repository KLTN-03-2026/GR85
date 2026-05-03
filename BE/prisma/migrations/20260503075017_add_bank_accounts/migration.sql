-- CreateTable
CREATE TABLE `Banks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Banks_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bank_Accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bank_id` INTEGER NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `account_name` VARCHAR(191) NOT NULL,
    `account_holder` VARCHAR(191) NOT NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Bank_Accounts_account_number_key`(`account_number`),
    INDEX `Bank_Accounts_bank_id_idx`(`bank_id`),
    INDEX `Bank_Accounts_account_number_idx`(`account_number`),
    INDEX `Bank_Accounts_is_verified_idx`(`is_verified`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Bank_Accounts` ADD CONSTRAINT `Bank_Accounts_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `Banks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
