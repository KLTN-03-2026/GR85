ALTER TABLE `Notifications`
  MODIFY `type` ENUM('WISHLIST_PRICE_DROP', 'WISHLIST_NEW_COUPON', 'ORDER_STATUS_CHANGED', 'REVIEW_REPLY', 'REVIEW_MODERATED', 'SYSTEM') NOT NULL;

ALTER TABLE `Reviews`
  ADD COLUMN `status` ENUM('VISIBLE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN `moderation_reason` TEXT NULL,
  ADD COLUMN `moderated_by` INTEGER NULL,
  ADD COLUMN `moderated_at` DATETIME(3) NULL;

ALTER TABLE `Reviews`
  ADD CONSTRAINT `Reviews_moderated_by_fkey`
  FOREIGN KEY (`moderated_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `Review_Replies` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `review_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `Review_Replies_review_id_created_at_idx`(`review_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Review_Moderation_Logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `review_id` INTEGER NOT NULL,
  `actor_id` INTEGER NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `reason` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `Review_Moderation_Logs_review_id_created_at_idx`(`review_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Review_Replies`
  ADD CONSTRAINT `Review_Replies_review_id_fkey`
  FOREIGN KEY (`review_id`) REFERENCES `Reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Review_Replies_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Review_Moderation_Logs`
  ADD CONSTRAINT `Review_Moderation_Logs_review_id_fkey`
  FOREIGN KEY (`review_id`) REFERENCES `Reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Review_Moderation_Logs_actor_id_fkey`
  FOREIGN KEY (`actor_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
