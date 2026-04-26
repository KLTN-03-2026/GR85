CREATE TABLE `Users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `avatar_url` VARCHAR(191) NULL,
    `wallet_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'BANNED', 'UNVERIFIED') NOT NULL DEFAULT 'ACTIVE',
    `role_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Permissions_action_name_key`(`action_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Role_Permissions` (
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `Categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contact_person` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Coupons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `coupon_scope` ENUM('PRODUCT', 'SHIPPING') NOT NULL DEFAULT 'PRODUCT',
    `discount_type` ENUM('PERCENT', 'FIXED_AMOUNT') NOT NULL,
    `discount_value` DECIMAL(15, 2) NOT NULL,
    `min_order_value` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `usage_limit` INTEGER NOT NULL DEFAULT 100,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'EXPIRED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Coupons_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Coupon_Users` (
    `coupon_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Coupon_Users_user_id_idx`(`user_id`),
    PRIMARY KEY (`coupon_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `price` DECIMAL(15, 2) NOT NULL,
    `sale_price` DECIMAL(15, 2) NULL,
    `sale_start_at` DATETIME(3) NULL,
    `sale_end_at` DATETIME(3) NULL,
    `warranty_months` INTEGER NOT NULL DEFAULT 12,
    `stock_quantity` INTEGER NOT NULL DEFAULT 0,
    `low_stock_threshold` INTEGER NOT NULL DEFAULT 5,
    `is_homepage_featured` BOOLEAN NOT NULL DEFAULT false,
    `display_order` INTEGER NOT NULL DEFAULT 9999,
    `specifications` JSON NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Products_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Product_Details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `full_description` LONGTEXT NULL,
    `in_the_box` TEXT NULL,
    `manual_url` VARCHAR(191) NULL,
    `warranty_policy` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_Details_product_id_key`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Product_Images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `alt_text` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Warehouses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `manager_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_code` VARCHAR(191) NOT NULL,
    `product_id` INTEGER NOT NULL,
    `warehouse_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `import_price` DECIMAL(15, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Batches_batch_code_key`(`batch_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Serial_Numbers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serial_code` VARCHAR(191) NOT NULL,
    `product_id` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `status` ENUM('IN_STOCK', 'SOLD', 'DEFECTIVE', 'IN_WARRANTY') NOT NULL DEFAULT 'IN_STOCK',
    `order_item_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Serial_Numbers_serial_code_key`(`serial_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Carts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Carts_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Cart_Items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cart_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `coupon_id` INTEGER NULL,
    `shipping_coupon_id` INTEGER NULL,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `shipping_fee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `shipping_discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `shipping_address` TEXT NOT NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `payment_method` ENUM('COD', 'VNPAY', 'MOMO', 'BANK_TRANSFER') NOT NULL,
    `payment_status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `order_status` ENUM('PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Order_Status_History` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `from_status` ENUM('PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED') NOT NULL,
    `to_status` ENUM('PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED') NOT NULL,
    `changed_by` INTEGER NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Order_Items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price_at_time` DECIMAL(15, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `status` ENUM('VISIBLE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'VISIBLE',
    `moderation_reason` TEXT NULL,
    `is_hidden` BOOLEAN NOT NULL DEFAULT false,
    `hidden_reason` TEXT NULL,
    `moderated_by` INTEGER NULL,
    `moderated_at` DATETIME(3) NULL,
    `admin_reply` TEXT NULL,
    `admin_replied_by` INTEGER NULL,
    `admin_replied_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Reviews_status_created_at_idx`(`status`, `created_at`),
    INDEX `Reviews_is_hidden_created_at_idx`(`is_hidden`, `created_at`),
    INDEX `Reviews_moderated_by_idx`(`moderated_by`),
    INDEX `Reviews_admin_replied_by_idx`(`admin_replied_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Review_Replies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `review_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Review_Replies_review_id_created_at_idx`(`review_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Review_Moderation_Logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `review_id` INTEGER NOT NULL,
    `actor_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Review_Moderation_Logs_review_id_created_at_idx`(`review_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Chat_Rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NOT NULL,
    `sender_id` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Message_Reads` (
    `message_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Message_Reads_user_id_read_at_idx`(`user_id`, `read_at`),
    PRIMARY KEY (`message_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Chat_Room_Meta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NOT NULL,
    `resolved_by` INTEGER NULL,
    `resolved_at` DATETIME(3) NULL,
    `customer_vote` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Chat_Room_Meta_room_id_key`(`room_id`),
    INDEX `Chat_Room_Meta_resolved_by_idx`(`resolved_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Chat_Moderation_Terms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `term` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Chat_Moderation_Terms_term_key`(`term`),
    INDEX `Chat_Moderation_Terms_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AI_Saved_Builds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `build_name` VARCHAR(191) NOT NULL,
    `total_price` DECIMAL(15, 2) NOT NULL,
    `prompt_used` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AI_Build_Items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `build_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `price_at_time` DECIMAL(15, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Email_Verifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `otp` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL DEFAULT 'EMAIL_VERIFY',
    `expired_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `User_Addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `label` VARCHAR(100) NULL,
    `receiver_name` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `address_line` TEXT NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `User_Addresses_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Wallet_Transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `order_id` INTEGER NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `type` ENUM('TOP_UP', 'PAYMENT_DEBIT', 'REFUND_CREDIT', 'ADJUSTMENT') NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Wallet_Transactions_user_id_idx`(`user_id`),
    INDEX `Wallet_Transactions_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Return_Requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `reviewed_by` INTEGER NULL,
    `reject_reason` TEXT NULL,
    `refund_amount` DECIMAL(15, 2) NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,

    INDEX `Return_Requests_order_id_idx`(`order_id`),
    INDEX `Return_Requests_user_id_idx`(`user_id`),
    INDEX `Return_Requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `User_Wishlist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `User_Wishlist_user_id_idx`(`user_id`),
    INDEX `User_Wishlist_product_id_idx`(`product_id`),
    UNIQUE INDEX `User_Wishlist_user_id_product_id_key`(`user_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('WISHLIST_PRICE_DROP', 'WISHLIST_NEW_COUPON', 'ORDER_STATUS_CHANGED', 'REVIEW_REPLY', 'REVIEW_MODERATED', 'SYSTEM') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `payload` JSON NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `read_at` DATETIME(3) NULL,

    INDEX `Notifications_user_id_is_read_idx`(`user_id`, `is_read`),
    INDEX `Notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Users` ADD CONSTRAINT `Users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `Roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Role_Permissions` ADD CONSTRAINT `Role_Permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `Roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Role_Permissions` ADD CONSTRAINT `Role_Permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `Permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Coupon_Users` ADD CONSTRAINT `Coupon_Users_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `Coupons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Coupon_Users` ADD CONSTRAINT `Coupon_Users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Products` ADD CONSTRAINT `Products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Products` ADD CONSTRAINT `Products_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `Suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Product_Details` ADD CONSTRAINT `Product_Details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Product_Images` ADD CONSTRAINT `Product_Images_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Batches` ADD CONSTRAINT `Batches_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Batches` ADD CONSTRAINT `Batches_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `Warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Batches` ADD CONSTRAINT `Batches_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `Suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Serial_Numbers` ADD CONSTRAINT `Serial_Numbers_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Serial_Numbers` ADD CONSTRAINT `Serial_Numbers_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `Batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Serial_Numbers` ADD CONSTRAINT `Serial_Numbers_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `Order_Items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Carts` ADD CONSTRAINT `Carts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Cart_Items` ADD CONSTRAINT `Cart_Items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `Carts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Cart_Items` ADD CONSTRAINT `Cart_Items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Orders` ADD CONSTRAINT `Orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Orders` ADD CONSTRAINT `Orders_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `Coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Orders` ADD CONSTRAINT `Orders_shipping_coupon_id_fkey` FOREIGN KEY (`shipping_coupon_id`) REFERENCES `Coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Order_Status_History` ADD CONSTRAINT `Order_Status_History_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `Orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Order_Items` ADD CONSTRAINT `Order_Items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `Orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Order_Items` ADD CONSTRAINT `Order_Items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Reviews` ADD CONSTRAINT `Reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Reviews` ADD CONSTRAINT `Reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Reviews` ADD CONSTRAINT `Reviews_moderated_by_fkey` FOREIGN KEY (`moderated_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Reviews` ADD CONSTRAINT `Reviews_admin_replied_by_fkey` FOREIGN KEY (`admin_replied_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Review_Replies` ADD CONSTRAINT `Review_Replies_review_id_fkey` FOREIGN KEY (`review_id`) REFERENCES `Reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Review_Replies` ADD CONSTRAINT `Review_Replies_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Review_Moderation_Logs` ADD CONSTRAINT `Review_Moderation_Logs_review_id_fkey` FOREIGN KEY (`review_id`) REFERENCES `Reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Review_Moderation_Logs` ADD CONSTRAINT `Review_Moderation_Logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Chat_Rooms` ADD CONSTRAINT `Chat_Rooms_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Messages` ADD CONSTRAINT `Messages_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `Chat_Rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Messages` ADD CONSTRAINT `Messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Message_Reads` ADD CONSTRAINT `Message_Reads_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `Messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Message_Reads` ADD CONSTRAINT `Message_Reads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Chat_Room_Meta` ADD CONSTRAINT `Chat_Room_Meta_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `Chat_Rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Chat_Room_Meta` ADD CONSTRAINT `Chat_Room_Meta_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AI_Saved_Builds` ADD CONSTRAINT `AI_Saved_Builds_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AI_Build_Items` ADD CONSTRAINT `AI_Build_Items_build_id_fkey` FOREIGN KEY (`build_id`) REFERENCES `AI_Saved_Builds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AI_Build_Items` ADD CONSTRAINT `AI_Build_Items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `User_Addresses` ADD CONSTRAINT `User_Addresses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Wallet_Transactions` ADD CONSTRAINT `Wallet_Transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Wallet_Transactions` ADD CONSTRAINT `Wallet_Transactions_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `Orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Return_Requests` ADD CONSTRAINT `Return_Requests_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `Orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Return_Requests` ADD CONSTRAINT `Return_Requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `User_Wishlist` ADD CONSTRAINT `User_Wishlist_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `User_Wishlist` ADD CONSTRAINT `User_Wishlist_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Notifications` ADD CONSTRAINT `Notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
