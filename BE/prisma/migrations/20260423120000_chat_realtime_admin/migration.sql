CREATE TABLE IF NOT EXISTS `Message_Reads` (
  `message_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`message_id`, `user_id`),
  INDEX `Message_Reads_user_id_read_at_idx` (`user_id`, `read_at`),
  CONSTRAINT `Message_Reads_message_id_fkey`
    FOREIGN KEY (`message_id`) REFERENCES `Messages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Message_Reads_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Chat_Room_Meta` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `room_id` INT NOT NULL,
  `resolved_by` INT NULL,
  `resolved_at` DATETIME(3) NULL,
  `customer_vote` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Chat_Room_Meta_room_id_key` (`room_id`),
  INDEX `Chat_Room_Meta_resolved_by_idx` (`resolved_by`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Chat_Room_Meta_room_id_fkey`
    FOREIGN KEY (`room_id`) REFERENCES `Chat_Rooms`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Chat_Room_Meta_resolved_by_fkey`
    FOREIGN KEY (`resolved_by`) REFERENCES `Users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Chat_Moderation_Terms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `term` VARCHAR(191) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Chat_Moderation_Terms_term_key` (`term`),
  INDEX `Chat_Moderation_Terms_is_active_idx` (`is_active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
