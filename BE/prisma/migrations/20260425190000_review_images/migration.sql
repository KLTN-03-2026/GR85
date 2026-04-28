-- Add image attachments for product reviews

SET @sql := IF(
  (SELECT COUNT(1) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'Review_Images') = 0,
  'CREATE TABLE Review_Images (
    id INT NOT NULL AUTO_INCREMENT,
    review_id INT NOT NULL,
    image_url VARCHAR(191) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_review_images_review_id_sort_order (review_id, sort_order),
    CONSTRAINT fk_review_images_review_id FOREIGN KEY (review_id) REFERENCES Reviews(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
