-- Bring existing DB schema in sync with prisma/schema.prisma for Reviews/Review_Replies.
-- This is intended for LOCAL development DB upgrades without a full reset.

-- 1) Review_Replies: user_id -> sender_id
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Review_Replies' AND column_name = 'sender_id') = 0
  AND
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Review_Replies' AND column_name = 'user_id') > 0,
  'ALTER TABLE `Review_Replies` CHANGE COLUMN `user_id` `sender_id` INT NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop old FK if it exists
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'Review_Replies' AND constraint_name = 'Review_Replies_user_id_fkey') > 0,
  'ALTER TABLE `Review_Replies` DROP FOREIGN KEY `Review_Replies_user_id_fkey`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure sender_id index
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Review_Replies' AND index_name = 'Review_Replies_sender_id_idx') = 0,
  'CREATE INDEX `Review_Replies_sender_id_idx` ON `Review_Replies`(`sender_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add new FK for sender_id
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'Review_Replies' AND constraint_name = 'Review_Replies_sender_id_fkey') = 0,
  'ALTER TABLE `Review_Replies` ADD CONSTRAINT `Review_Replies_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 2) Reviews: add order_item_id + best-effort backfill + FK + indexes
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND column_name = 'order_item_id') = 0,
  'ALTER TABLE `Reviews` ADD COLUMN `order_item_id` INT NULL AFTER `product_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill (best-effort): set order_item_id for latest review per (user, product)
UPDATE `Reviews` r
JOIN (
  SELECT rr.user_id, rr.product_id, MAX(rr.id) AS latest_review_id
  FROM `Reviews` rr
  GROUP BY rr.user_id, rr.product_id
) latest ON latest.latest_review_id = r.id
LEFT JOIN (
  SELECT oi.product_id, o.user_id, MAX(oi.id) AS latest_order_item_id
  FROM `Order_Items` oi
  JOIN `Orders` o ON o.id = oi.order_id
  WHERE o.order_status = 'DELIVERED' AND o.payment_status = 'PAID'
  GROUP BY o.user_id, oi.product_id
) lo ON lo.user_id = r.user_id AND lo.product_id = r.product_id
SET r.order_item_id = lo.latest_order_item_id
WHERE r.order_item_id IS NULL;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'uniq_reviews_order_item') = 0,
  'CREATE UNIQUE INDEX `uniq_reviews_order_item` ON `Reviews`(`order_item_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'idx_reviews_order_item') = 0,
  'CREATE INDEX `idx_reviews_order_item` ON `Reviews`(`order_item_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'Reviews' AND constraint_name = 'fk_reviews_order_item') = 0,
  'ALTER TABLE `Reviews` ADD CONSTRAINT `fk_reviews_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `Order_Items`(`id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 3) Reviews: thread status tracking
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND column_name = 'thread_status') = 0,
  'ALTER TABLE `Reviews` ADD COLUMN `thread_status` ENUM(''OPEN'',''WAITING_ADMIN'',''WAITING_CUSTOMER'',''RESOLVED'') NOT NULL DEFAULT ''OPEN'' AFTER `admin_replied_at`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND column_name = 'thread_resolved_by') = 0,
  'ALTER TABLE `Reviews` ADD COLUMN `thread_resolved_by` INT NULL AFTER `thread_status`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND column_name = 'thread_resolved_at') = 0,
  'ALTER TABLE `Reviews` ADD COLUMN `thread_resolved_at` DATETIME NULL AFTER `thread_resolved_by`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill thread status based on latest reply sender
UPDATE `Reviews` r
LEFT JOIN (
  SELECT rr.review_id, rr.sender_id
  FROM `Review_Replies` rr
  INNER JOIN (
    SELECT review_id, MAX(created_at) AS max_created_at, MAX(id) AS max_id
    FROM `Review_Replies`
    GROUP BY review_id
  ) latest
    ON latest.review_id = rr.review_id
    AND latest.max_created_at = rr.created_at
    AND latest.max_id = rr.id
) lr ON lr.review_id = r.id
SET r.thread_status = CASE
  WHEN lr.sender_id IS NOT NULL AND lr.sender_id = r.user_id THEN 'WAITING_ADMIN'
  WHEN lr.sender_id IS NOT NULL AND lr.sender_id <> r.user_id THEN 'WAITING_CUSTOMER'
  WHEN r.admin_reply IS NOT NULL AND TRIM(r.admin_reply) <> '' THEN 'WAITING_CUSTOMER'
  ELSE 'OPEN'
END
WHERE r.thread_status = 'OPEN';

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'idx_reviews_thread_status_updated') = 0,
  'CREATE INDEX `idx_reviews_thread_status_updated` ON `Reviews`(`thread_status`, `updated_at`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'idx_reviews_thread_resolved_by') = 0,
  'CREATE INDEX `idx_reviews_thread_resolved_by` ON `Reviews`(`thread_resolved_by`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'Reviews' AND constraint_name = 'fk_reviews_thread_resolved_by') = 0,
  'ALTER TABLE `Reviews` ADD CONSTRAINT `fk_reviews_thread_resolved_by` FOREIGN KEY (`thread_resolved_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 4) Review_Images table
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'Review_Images') = 0,
  'CREATE TABLE `Review_Images` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `review_id` INT NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_review_images_review_id_sort_order` (`review_id`, `sort_order`),
    CONSTRAINT `fk_review_images_review_id` FOREIGN KEY (`review_id`) REFERENCES `Reviews`(`id`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
