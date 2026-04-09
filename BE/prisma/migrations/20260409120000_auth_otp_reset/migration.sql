ALTER TABLE `Email_Verifications`
    ADD COLUMN `purpose` VARCHAR(191) NOT NULL DEFAULT 'EMAIL_VERIFY' AFTER `otp`,
    ADD COLUMN `used_at` DATETIME(3) NULL AFTER `expired_at`;

CREATE INDEX `Email_Verifications_email_purpose_created_at_idx`
    ON `Email_Verifications` (`email`, `purpose`, `created_at`);
