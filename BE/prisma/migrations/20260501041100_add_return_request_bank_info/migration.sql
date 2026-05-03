/*
  Warnings:

  - You are about to drop the column `user_id` on the `review_replies` table. All the data in the column will be lost.
  - You are about to drop the column `moderation_reason` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the `review_moderation_logs` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[order_item_id]` on the table `Reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sender_id` to the `Review_Replies` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `review_moderation_logs` DROP FOREIGN KEY `Review_Moderation_Logs_actor_id_fkey`;

-- DropForeignKey
ALTER TABLE `review_moderation_logs` DROP FOREIGN KEY `Review_Moderation_Logs_review_id_fkey`;

-- DropForeignKey
ALTER TABLE `review_replies` DROP FOREIGN KEY `Review_Replies_user_id_fkey`;

-- DropIndex
DROP INDEX `Review_Replies_user_id_fkey` ON `review_replies`;

-- DropIndex
DROP INDEX `Reviews_status_created_at_idx` ON `reviews`;

-- AlterTable
ALTER TABLE `categories` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `orders` MODIFY `payment_method` ENUM('COD', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'SEPAY') NOT NULL;

-- AlterTable
ALTER TABLE `return_requests` ADD COLUMN `bank_account_name` VARCHAR(191) NULL,
    ADD COLUMN `bank_account_number` VARCHAR(191) NULL,
    ADD COLUMN `bank_name` VARCHAR(191) NULL,
    ADD COLUMN `note` TEXT NULL,
    ADD COLUMN `received_at` DATETIME(3) NULL,
    ADD COLUMN `refunded_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'SHIPPING_BACK', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `review_replies` DROP COLUMN `user_id`,
    ADD COLUMN `sender_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `reviews` DROP COLUMN `moderation_reason`,
    DROP COLUMN `status`,
    ADD COLUMN `order_item_id` INTEGER NULL,
    ADD COLUMN `thread_resolved_at` DATETIME(3) NULL,
    ADD COLUMN `thread_resolved_by` INTEGER NULL,
    ADD COLUMN `thread_status` ENUM('OPEN', 'WAITING_ADMIN', 'WAITING_CUSTOMER', 'RESOLVED') NOT NULL DEFAULT 'OPEN';

-- DropTable
DROP TABLE `review_moderation_logs`;

-- CreateTable
CREATE TABLE `Review_Images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `review_id` INTEGER NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Review_Images_review_id_sort_order_idx`(`review_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AI_Settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `model` VARCHAR(191) NOT NULL DEFAULT 'gpt-4o-mini',
    `temperature` DOUBLE NOT NULL DEFAULT 0.7,
    `max_token` INTEGER NOT NULL DEFAULT 2000,
    `system_prompt` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AI_Request_Logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `response` TEXT NOT NULL,
    `model_used` VARCHAR(191) NOT NULL,
    `prompt_tokens` INTEGER NOT NULL,
    `completion_tokens` INTEGER NOT NULL,
    `total_tokens` INTEGER NOT NULL,
    `cost` DECIMAL(15, 6) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AI_Request_Logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Return_Items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Return_Items_return_id_idx`(`return_id`),
    INDEX `Return_Items_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Return_Media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_id` INTEGER NOT NULL,
    `media_url` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Return_Media_return_id_idx`(`return_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Return_Logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `created_by` INTEGER NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Return_Logs_return_id_idx`(`return_id`),
    INDEX `Return_Logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Review_Replies_sender_id_idx` ON `Review_Replies`(`sender_id`);

-- CreateIndex
CREATE INDEX `Reviews_thread_status_updated_at_idx` ON `Reviews`(`thread_status`, `updated_at`);

-- CreateIndex
CREATE INDEX `Reviews_thread_resolved_by_idx` ON `Reviews`(`thread_resolved_by`);

-- CreateIndex
CREATE INDEX `Reviews_order_item_id_idx` ON `Reviews`(`order_item_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Reviews_order_item_id_key` ON `Reviews`(`order_item_id`);

-- AddForeignKey
ALTER TABLE `Reviews` ADD CONSTRAINT `Reviews_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `Order_Items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reviews` ADD CONSTRAINT `Reviews_thread_resolved_by_fkey` FOREIGN KEY (`thread_resolved_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review_Images` ADD CONSTRAINT `Review_Images_review_id_fkey` FOREIGN KEY (`review_id`) REFERENCES `Reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review_Replies` ADD CONSTRAINT `Review_Replies_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AI_Request_Logs` ADD CONSTRAINT `AI_Request_Logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Return_Items` ADD CONSTRAINT `Return_Items_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `Return_Requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Return_Items` ADD CONSTRAINT `Return_Items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Return_Media` ADD CONSTRAINT `Return_Media_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `Return_Requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Return_Logs` ADD CONSTRAINT `Return_Logs_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `Return_Requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
