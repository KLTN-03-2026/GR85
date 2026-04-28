-- Hybrid reviews:
-- - Allow multiple reviews per (user, product) by tying a review to an Order_Item
-- - Enforce one review per order item via unique index on order_item_id
--
-- Steps:
-- 1) Drop the previous unique index that forced one review per (user, product)
-- 2) Add order_item_id column (nullable for legacy data)
-- 3) Backfill order_item_id for the latest review per (user, product) to the latest DELIVERED order item
-- 4) Add FK + unique index on order_item_id

-- 1) Drop old uniqueness if it exists
-- MySQL may rely on the previous composite unique index to satisfy FK index requirements.
-- Ensure single-column indexes exist first, then drop the unique index.
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'idx_reviews_user_id') = 0,
  'CREATE INDEX idx_reviews_user_id ON Reviews(user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'idx_reviews_product_id') = 0,
  'CREATE INDEX idx_reviews_product_id ON Reviews(product_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'uniq_reviews_user_product') > 0,
  'DROP INDEX uniq_reviews_user_product ON Reviews',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Add nullable column for legacy reviews
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND column_name = 'order_item_id') = 0,
  'ALTER TABLE Reviews ADD COLUMN order_item_id INT NULL AFTER product_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Backfill (best-effort): set order_item_id for latest review per (user, product)
--    to the latest DELIVERED+PAID order item for that user/product.
--    Older reviews remain NULL (allowed).
UPDATE Reviews r
JOIN (
  SELECT
    rr.user_id,
    rr.product_id,
    MAX(rr.id) AS latest_review_id
  FROM Reviews rr
  GROUP BY rr.user_id, rr.product_id
) latest ON latest.latest_review_id = r.id
LEFT JOIN (
  SELECT
    oi.product_id,
    o.user_id,
    MAX(oi.id) AS latest_order_item_id
  FROM Order_Items oi
  JOIN Orders o ON o.id = oi.order_id
  WHERE o.order_status = 'DELIVERED' AND o.payment_status = 'PAID'
  GROUP BY o.user_id, oi.product_id
) lo ON lo.user_id = r.user_id AND lo.product_id = r.product_id
SET r.order_item_id = lo.latest_order_item_id
WHERE r.order_item_id IS NULL;

-- 4) FK + unique index (MySQL allows multiple NULLs in unique index)
SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'uniq_reviews_order_item') = 0,
  'CREATE UNIQUE INDEX uniq_reviews_order_item ON Reviews(order_item_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'idx_reviews_order_item') = 0,
  'CREATE INDEX idx_reviews_order_item ON Reviews(order_item_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'Reviews' AND constraint_name = 'fk_reviews_order_item') = 0,
  'ALTER TABLE Reviews ADD CONSTRAINT fk_reviews_order_item FOREIGN KEY (order_item_id) REFERENCES Order_Items(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
