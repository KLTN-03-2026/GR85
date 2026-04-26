-- Reconcile index drift without resetting development data

-- 1) Ensure Email_Verifications composite index exists
SET @email_table := (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND LOWER(table_name) = LOWER('Email_Verifications')
  LIMIT 1
);

SET @email_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = @email_table
    AND index_name = 'Email_Verifications_email_purpose_created_at_idx'
);

SET @sql_email_idx := IF(
  @email_table IS NOT NULL AND @email_idx_exists = 0,
  CONCAT('CREATE INDEX `Email_Verifications_email_purpose_created_at_idx` ON `', @email_table, '` (`email`, `purpose`, `created_at`)'),
  'SELECT 1'
);

PREPARE stmt_email_idx FROM @sql_email_idx;
EXECUTE stmt_email_idx;
DEALLOCATE PREPARE stmt_email_idx;

-- 2) Ensure Products display order indexes exist
SET @products_table := (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND LOWER(table_name) = LOWER('Products')
  LIMIT 1
);

SET @products_display_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = @products_table
    AND index_name = 'Products_display_order_idx'
);

SET @sql_products_display_idx := IF(
  @products_table IS NOT NULL AND @products_display_idx_exists = 0,
  CONCAT('CREATE INDEX `Products_display_order_idx` ON `', @products_table, '` (`display_order`)'),
  'SELECT 1'
);

PREPARE stmt_products_display_idx FROM @sql_products_display_idx;
EXECUTE stmt_products_display_idx;
DEALLOCATE PREPARE stmt_products_display_idx;

SET @products_featured_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = @products_table
    AND index_name = 'Products_is_homepage_featured_display_order_idx'
);

SET @sql_products_featured_idx := IF(
  @products_table IS NOT NULL AND @products_featured_idx_exists = 0,
  CONCAT('CREATE INDEX `Products_is_homepage_featured_display_order_idx` ON `', @products_table, '` (`is_homepage_featured`, `display_order`)'),
  'SELECT 1'
);

PREPARE stmt_products_featured_idx FROM @sql_products_featured_idx;
EXECUTE stmt_products_featured_idx;
DEALLOCATE PREPARE stmt_products_featured_idx;

-- 3) Align Order_Status_History index name
SET @history_table := (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND LOWER(table_name) = LOWER('Order_Status_History')
  LIMIT 1
);

SET @history_target_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = @history_table
    AND index_name = 'Order_Status_History_order_id_idx'
);

SET @history_legacy_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = @history_table
    AND index_name = 'Order_Status_History_order_id_fkey'
);

SET @sql_history_idx := IF(
  @history_table IS NOT NULL AND @history_target_exists = 0 AND @history_legacy_exists > 0,
  CONCAT('ALTER TABLE `', @history_table, '` RENAME INDEX `Order_Status_History_order_id_fkey` TO `Order_Status_History_order_id_idx`'),
  'SELECT 1'
);

PREPARE stmt_history_idx FROM @sql_history_idx;
EXECUTE stmt_history_idx;
DEALLOCATE PREPARE stmt_history_idx;
