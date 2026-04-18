ALTER TABLE `Products`
  ADD COLUMN `sale_price` DECIMAL(15,2) NULL,
  ADD COLUMN `sale_start_at` DATETIME(3) NULL,
  ADD COLUMN `sale_end_at` DATETIME(3) NULL,
  ADD COLUMN `low_stock_threshold` INT NOT NULL DEFAULT 5;

CREATE TABLE `User_Wishlist` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `product_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `User_Wishlist_user_id_product_id_key`(`user_id`, `product_id`),
  INDEX `User_Wishlist_user_id_idx`(`user_id`),
  INDEX `User_Wishlist_product_id_idx`(`product_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Notifications` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `type` ENUM('WISHLIST_PRICE_DROP', 'WISHLIST_NEW_COUPON', 'SYSTEM') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `payload` JSON NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `read_at` DATETIME(3) NULL,

  INDEX `Notifications_user_id_is_read_idx`(`user_id`, `is_read`),
  INDEX `Notifications_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User_Wishlist` ADD CONSTRAINT `User_Wishlist_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `User_Wishlist` ADD CONSTRAINT `User_Wishlist_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Notifications` ADD CONSTRAINT `Notifications_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
