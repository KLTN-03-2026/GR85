CREATE TABLE `Order_Status_History` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `order_id` INTEGER NOT NULL,
  `from_status` ENUM('PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED') NOT NULL,
  `to_status` ENUM('PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED') NOT NULL,
  `changed_by` INTEGER NOT NULL,
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `Order_Status_History_order_id_idx`(`order_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Order_Status_History` ADD CONSTRAINT `Order_Status_History_order_id_fkey`
  FOREIGN KEY (`order_id`) REFERENCES `Orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
