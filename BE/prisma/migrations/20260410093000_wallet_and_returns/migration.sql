-- Add wallet balance to users
ALTER TABLE `Users`
ADD COLUMN `wallet_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- Create wallet transaction table
CREATE TABLE `Wallet_Transactions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `order_id` INTEGER NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `type` ENUM('TOP_UP', 'PAYMENT_DEBIT', 'REFUND_CREDIT', 'ADJUSTMENT') NOT NULL,
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `Wallet_Transactions_user_id_idx`(`user_id`),
  INDEX `Wallet_Transactions_order_id_idx`(`order_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create return requests table
CREATE TABLE `Return_Requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `order_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `reviewed_by` INTEGER NULL,
  `reject_reason` TEXT NULL,
  `refund_amount` DECIMAL(15, 2) NULL,
  `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_at` DATETIME(3) NULL,

  INDEX `Return_Requests_order_id_idx`(`order_id`),
  INDEX `Return_Requests_user_id_idx`(`user_id`),
  INDEX `Return_Requests_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `Wallet_Transactions`
ADD CONSTRAINT `Wallet_Transactions_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Wallet_Transactions`
ADD CONSTRAINT `Wallet_Transactions_order_id_fkey`
FOREIGN KEY (`order_id`) REFERENCES `Orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Return_Requests`
ADD CONSTRAINT `Return_Requests_order_id_fkey`
FOREIGN KEY (`order_id`) REFERENCES `Orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Return_Requests`
ADD CONSTRAINT `Return_Requests_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
