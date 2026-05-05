ALTER TABLE `Review_Images`
  ADD COLUMN `is_approved` BOOLEAN NOT NULL DEFAULT FALSE AFTER `image_url`,
  ADD COLUMN `moderated_by` INTEGER NULL AFTER `is_approved`,
  ADD COLUMN `moderated_at` DATETIME(3) NULL AFTER `moderated_by`,
  ADD COLUMN `rejection_reason` TEXT NULL AFTER `moderated_at`;
