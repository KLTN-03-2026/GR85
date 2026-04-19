-- Add scope to Coupons to distinguish product voucher vs shipping voucher
ALTER TABLE `Coupons`
  ADD COLUMN `coupon_scope` ENUM('PRODUCT', 'SHIPPING') NOT NULL DEFAULT 'PRODUCT';

-- Allow assigning coupons to specific users
CREATE TABLE `Coupon_Users` (
  `coupon_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`coupon_id`, `user_id`),
  INDEX `Coupon_Users_user_id_idx`(`user_id`),
  CONSTRAINT `Coupon_Users_coupon_id_fkey`
    FOREIGN KEY (`coupon_id`) REFERENCES `Coupons`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Coupon_Users_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Track shipping voucher and shipping fee breakdown on Orders
ALTER TABLE `Orders`
  ADD COLUMN `shipping_coupon_id` INT NULL,
  ADD COLUMN `shipping_fee` DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN `shipping_discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD INDEX `Orders_shipping_coupon_id_idx`(`shipping_coupon_id`),
  ADD CONSTRAINT `Orders_shipping_coupon_id_fkey`
    FOREIGN KEY (`shipping_coupon_id`) REFERENCES `Coupons`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;