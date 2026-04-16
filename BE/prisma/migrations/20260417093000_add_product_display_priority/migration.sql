-- Add admin-controlled product priority settings for homepage and components listing
ALTER TABLE `Products`
  ADD COLUMN `is_homepage_featured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `display_order` INT NOT NULL DEFAULT 9999;

CREATE INDEX `Products_display_order_idx` ON `Products`(`display_order`);
CREATE INDEX `Products_is_homepage_featured_display_order_idx` ON `Products`(`is_homepage_featured`, `display_order`);
