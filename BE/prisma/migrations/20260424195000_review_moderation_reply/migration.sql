ALTER TABLE `Reviews`
  ADD COLUMN `is_hidden` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `hidden_reason` TEXT NULL,
  ADD COLUMN `admin_reply` TEXT NULL,
  ADD COLUMN `admin_replied_by` INT NULL,
  ADD COLUMN `admin_replied_at` DATETIME(3) NULL,
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

CREATE INDEX `Reviews_is_hidden_created_at_idx` ON `Reviews`(`is_hidden`, `created_at`);
CREATE INDEX `Reviews_admin_replied_by_idx` ON `Reviews`(`admin_replied_by`);

ALTER TABLE `Reviews`
  ADD CONSTRAINT `Reviews_admin_replied_by_fkey`
    FOREIGN KEY (`admin_replied_by`) REFERENCES `Users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
