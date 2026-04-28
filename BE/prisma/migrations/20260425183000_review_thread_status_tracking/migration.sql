-- Track review thread lifecycle for admin follow-up
-- States:
-- - OPEN: no explicit waiting state yet
-- - WAITING_ADMIN: waiting for admin to respond
-- - WAITING_CUSTOMER: waiting for customer feedback
-- - RESOLVED: admin marked thread as completed

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND column_name = 'thread_status') = 0,
  'ALTER TABLE Reviews ADD COLUMN thread_status ENUM(''OPEN'',''WAITING_ADMIN'',''WAITING_CUSTOMER'',''RESOLVED'') NOT NULL DEFAULT ''OPEN'' AFTER admin_replied_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND column_name = 'thread_resolved_by') = 0,
  'ALTER TABLE Reviews ADD COLUMN thread_resolved_by INT NULL AFTER thread_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND column_name = 'thread_resolved_at') = 0,
  'ALTER TABLE Reviews ADD COLUMN thread_resolved_at DATETIME NULL AFTER thread_resolved_by',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill thread status based on latest message direction
UPDATE Reviews r
LEFT JOIN (
  SELECT rr.review_id, rr.sender_id
  FROM Review_Replies rr
  INNER JOIN (
    SELECT review_id, MAX(created_at) AS max_created_at, MAX(id) AS max_id
    FROM Review_Replies
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
  'CREATE INDEX idx_reviews_thread_status_updated ON Reviews(thread_status, updated_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Reviews' AND index_name = 'idx_reviews_thread_resolved_by') = 0,
  'CREATE INDEX idx_reviews_thread_resolved_by ON Reviews(thread_resolved_by)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'Reviews' AND constraint_name = 'fk_reviews_thread_resolved_by') = 0,
  'ALTER TABLE Reviews ADD CONSTRAINT fk_reviews_thread_resolved_by FOREIGN KEY (thread_resolved_by) REFERENCES Users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
