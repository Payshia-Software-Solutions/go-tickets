<?php
// migrate_booking_payments.php
require_once __DIR__ . '/config/database.php';

header('Content-Type: application/json');

try {
    // 1. Add amount_paid column if not exists
    $pdo->exec("ALTER TABLE `booking` ADD COLUMN IF NOT EXISTS `amount_paid` DECIMAL(10,2) DEFAULT 0.00 AFTER `totalPrice`");
    
    // 2. Add balance_amount column if not exists
    $pdo->exec("ALTER TABLE `booking` ADD COLUMN IF NOT EXISTS `balance_amount` DECIMAL(10,2) DEFAULT 0.00 AFTER `amount_paid`");
    
    // 3. Add payment_method column if not exists
    $pdo->exec("ALTER TABLE `booking` ADD COLUMN IF NOT EXISTS `payment_method` VARCHAR(50) DEFAULT 'online_payhere' AFTER `balance_amount`");
    
    // 4. Add payment_slip column if not exists
    $pdo->exec("ALTER TABLE `booking` ADD COLUMN IF NOT EXISTS `payment_slip` VARCHAR(255) NULL AFTER `payment_method`");
    
    // 5. Add payment_notes column if not exists
    $pdo->exec("ALTER TABLE `booking` ADD COLUMN IF NOT EXISTS `payment_notes` TEXT NULL AFTER `payment_slip`");

    // 6. Create booking_payments ledger table for installment tracking
    $pdo->exec("CREATE TABLE IF NOT EXISTS `booking_payments` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `booking_id` INT NOT NULL,
        `amount` DECIMAL(10,2) NOT NULL,
        `payment_method` VARCHAR(50) DEFAULT 'bank_transfer',
        `payment_slip` VARCHAR(255) NULL,
        `reference` VARCHAR(100) NULL,
        `notes` TEXT NULL,
        `created_at` DATETIME NOT NULL,
        INDEX (`booking_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Update existing paid bookings to have amount_paid = totalPrice and balance_amount = 0
    $pdo->exec("UPDATE `booking` SET `amount_paid` = `totalPrice`, `balance_amount` = 0.00 WHERE LOWER(`payment_status`) = 'paid' AND `amount_paid` = 0.00");
    
    // Update existing pending bookings to have balance_amount = totalPrice
    $pdo->exec("UPDATE `booking` SET `balance_amount` = `totalPrice` WHERE LOWER(`payment_status`) != 'paid' AND `balance_amount` = 0.00");

    echo json_encode([
        'success' => true,
        'message' => 'Database migration completed successfully!'
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
