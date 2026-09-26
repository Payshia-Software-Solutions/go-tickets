<?php

class Booking
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all bookings
    public function getAllBookings()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking`");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get booking by ID
    public function getBookingById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get bookings by User ID (newest first, default limit of 5)
    public function getBookingsByUserId($userId, $limit = 5)
    {
        $sql = "SELECT * FROM `booking` WHERE `userId` = ? ORDER BY `id` DESC";
        if ($limit !== null && intval($limit) > 0) {
            $sql .= " LIMIT " . intval($limit);
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get booking by QR Code Value
    public function getBookingByQrCode($qrCodeValue)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking` WHERE `qrCodeValue` = ?");
        $stmt->execute([$qrCodeValue]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function createBooking($data)
    {
        // Set timezone to Asia/Colombo
        date_default_timezone_set('Asia/Colombo');

        // Get current datetime
        $now = date('Y-m-d H:i:s');

        $stmt = $this->pdo->prepare("INSERT INTO `booking` (
        `userId`, `first_name`, `last_name`, `nic`, `contact_number`, `email`, `guest`,
        `totalPrice`, `amount_paid`, `balance_amount`, `payment_method`, `payment_slip`, `payment_notes`,
        `payment_status`, `bookingDate`, `eventName`, `eventDate`, `eventLocation`,
        `qrCodeValue`, `booked_type`, `createdAt`, `updatedAt`
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $totalPrice = floatval($data['totalPrice']);
        $isComplimentary = isset($data['payment_method']) && strtolower(trim($data['payment_method'])) === 'complimentary';
        $amountPaid = $isComplimentary ? 0.00 : (isset($data['amount_paid']) ? floatval($data['amount_paid']) : 0.00);
        $balanceAmount = $isComplimentary ? 0.00 : (isset($data['balance_amount']) ? floatval($data['balance_amount']) : max(0.00, $totalPrice - $amountPaid));
        $paymentStatus = $isComplimentary ? 'Paid' : ($data['payment_status'] ?? 'pending');

        $stmt->execute([
            $data['userId'],
            $data['first_name'],
            $data['last_name'],
            $data['nic'],
            $data['contact_number'],
            $data['email'],
            $data['guest'] ?? 0,
            $totalPrice,
            $amountPaid,
            $balanceAmount,
            $data['payment_method'] ?? 'online_payhere',
            $data['payment_slip'] ?? null,
            $data['payment_notes'] ?? null,
            $paymentStatus,
            $now,                         // bookingDate
            $data['eventName'],
            $data['eventDate'],
            $data['eventLocation'],
            $data['qrCodeValue'],
            $data['booked_type'] ?? 'online',
            $now,                         // createdAt
            $now                          // updatedAt
        ]);

        return $this->pdo->lastInsertId();
    }


    // Update a booking
    public function updateBooking($id, $data)
    {
        $existing = $this->getBookingById($id);
        $totalPrice = isset($data['totalPrice']) ? floatval($data['totalPrice']) : floatval($existing['totalPrice']);
        $currentMethod = $data['payment_method'] ?? ($existing['payment_method'] ?? '');
        $isComplimentary = strtolower(trim($currentMethod)) === 'complimentary';
        $amountPaid = $isComplimentary ? 0.00 : (isset($data['amount_paid']) ? floatval($data['amount_paid']) : floatval($existing['amount_paid'] ?? 0.00));
        $balanceAmount = $isComplimentary ? 0.00 : (isset($data['balance_amount']) ? floatval($data['balance_amount']) : max(0.00, $totalPrice - $amountPaid));
        $paymentStatus = $isComplimentary ? 'Paid' : ($data['payment_status'] ?? ($existing['payment_status'] ?? 'pending'));

        $stmt = $this->pdo->prepare("UPDATE `booking` SET
            `userId` = ?, `first_name` = ?, `last_name` = ?, `nic` = ?, `contact_number` = ?, `email` = ?, `guest` = ?,
            `totalPrice` = ?, `amount_paid` = ?, `balance_amount` = ?, `payment_method` = ?, `payment_slip` = ?, `payment_notes` = ?,
            `eventName` = ?, `eventDate` = ?, `eventLocation` = ?, `qrCodeValue` = ?, `payment_status` = ?, `updatedAt` = NOW()
            WHERE `id` = ?");

        $stmt->execute([
            $data['userId'] ?? $existing['userId'],
            $data['first_name'] ?? $existing['first_name'],
            $data['last_name'] ?? $existing['last_name'],
            $data['nic'] ?? $existing['nic'],
            $data['contact_number'] ?? $existing['contact_number'],
            $data['email'] ?? $existing['email'],
            $data['guest'] ?? $existing['guest'],
            $totalPrice,
            $amountPaid,
            $balanceAmount,
            $data['payment_method'] ?? ($existing['payment_method'] ?? 'online_payhere'),
            $data['payment_slip'] ?? ($existing['payment_slip'] ?? null),
            $data['payment_notes'] ?? ($existing['payment_notes'] ?? null),
            $data['eventName'] ?? $existing['eventName'],
            $data['eventDate'] ?? $existing['eventDate'],
            $data['eventLocation'] ?? $existing['eventLocation'],
            $data['qrCodeValue'] ?? $existing['qrCodeValue'],
            $paymentStatus,
            $id
        ]);
    }

    // Add installment / payment record to booking_payments table
    public function addPaymentRecord($bookingId, $paymentData)
    {
        $stmt = $this->pdo->prepare("INSERT INTO `booking_payments` (
            `booking_id`, `amount`, `payment_method`, `payment_slip`, `reference`, `notes`, `created_at`
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())");

        $stmt->execute([
            $bookingId,
            $paymentData['amount'],
            $paymentData['payment_method'] ?? 'bank_transfer',
            $paymentData['payment_slip'] ?? null,
            $paymentData['reference'] ?? null,
            $paymentData['notes'] ?? null
        ]);

        // Recalculate amount_paid and balance_amount in booking table
        $sumStmt = $this->pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total_paid FROM `booking_payments` WHERE `booking_id` = ?");
        $sumStmt->execute([$bookingId]);
        $sumResult = $sumStmt->fetch(PDO::FETCH_ASSOC);
        $totalPaid = floatval($sumResult['total_paid']);

        $booking = $this->getBookingById($bookingId);
        $totalPrice = floatval($booking['totalPrice']);
        $newBalance = max(0.00, $totalPrice - $totalPaid);
        $newStatus = $newBalance <= 0.00 ? 'Paid' : ($totalPaid > 0.00 ? 'Partially Paid' : 'pending');

        $updStmt = $this->pdo->prepare("UPDATE `booking` SET 
            `amount_paid` = ?, 
            `balance_amount` = ?, 
            `payment_status` = ?, 
            `payment_slip` = COALESCE(?, `payment_slip`),
            `updatedAt` = NOW() 
            WHERE `id` = ?");
        
        $updStmt->execute([
            $totalPaid, 
            $newBalance, 
            $newStatus, 
            $paymentData['payment_slip'] ?? null, 
            $bookingId
        ]);

        return [
            'amount_paid' => $totalPaid,
            'balance_amount' => $newBalance,
            'payment_status' => $newStatus
        ];
    }

    // Get all payment records for a booking
    public function getPaymentsByBookingId($bookingId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking_payments` WHERE `booking_id` = ? ORDER BY `created_at` DESC");
        $stmt->execute([$bookingId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Update payment status only
    public function updatePaymentStatus($id, $payment_status)
    {
        if (strtolower($payment_status) === 'paid') {
            $stmt = $this->pdo->prepare("UPDATE `booking` SET `payment_status` = ?, `amount_paid` = `totalPrice`, `balance_amount` = 0.00 WHERE `id` = ?");
            $stmt->execute([$payment_status, $id]);
        } else {
            $stmt = $this->pdo->prepare("UPDATE `booking` SET `payment_status` = ? WHERE `id` = ?");
            $stmt->execute([$payment_status, $id]);
        }
    }

    // Delete a booking
    public function deleteBooking($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `booking` WHERE `id` = ?");
        $stmt->execute([$id]);
    }

    // Get total count of bookings
    public function getBookingCount()
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS total FROM `booking`");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['total'];
    }
}
