-- DropIndex
SET @target_table := (
	SELECT table_name
	FROM information_schema.tables
	WHERE table_schema = DATABASE()
		AND LOWER(table_name) = LOWER('Email_Verifications')
	LIMIT 1
);

SET @index_exists := (
	SELECT COUNT(*)
	FROM information_schema.statistics
	WHERE table_schema = DATABASE()
		AND table_name = @target_table
		AND index_name = 'Email_Verifications_email_purpose_created_at_idx'
);

SET @drop_sql := IF(
	@target_table IS NOT NULL AND @index_exists > 0,
	CONCAT('DROP INDEX `Email_Verifications_email_purpose_created_at_idx` ON `', @target_table, '`'),
	'SELECT 1'
);

PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
