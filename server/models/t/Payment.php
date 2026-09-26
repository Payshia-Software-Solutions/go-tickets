<?php

class Payment
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all payments
    public function getAllPayments()
    {
        $stmt = $this->pdo->prepare("SELECT `id`, `rec_number`, `payment_type`, `payment_amount`, `payment_status`, `created_by`, `created_at`, `reference_id` FROM `payments`");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get a payment by ID
    public function getPaymentById($id)
    {
        $stmt = $this->pdo->prepare("SELECT `id`, `rec_number`, `payment_type`, `payment_amount`, `payment_status`, `created_by`, `created_at`, `reference_id` FROM `payments` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Create a new payment
    public function createPayment($data)
    {
        $data['created_at'] = date('Y-m-d H:i:s');

        $stmt = $this->pdo->prepare("INSERT INTO `payments` (`rec_number`, `payment_type`, `payment_amount`, `payment_status`, `created_by`, `created_at`, `reference_id`) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['rec_number'],
            $data['payment_type'],
            $data['payment_amount'],
            $data['payment_status'],
            $data['created_by'],
            $data['created_at'],
            $data['reference_id']
        ]);
    }

    // Update an existing payment
    public function updatePayment($id, $data)
    {
        $data['created_at'] = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare("UPDATE `payments` SET `rec_number` = ?, `payment_type` = ?, `payment_amount` = ?, `payment_status` = ?, `created_by` = ?, `created_at` = ?, `reference_id` = ? WHERE `id` = ?");
        $stmt->execute([
            $data['rec_number'],
            $data['payment_type'],
            $data['payment_amount'],
            $data['payment_status'],
            $data['created_by'],
            $data['created_at'],
            $data['reference_id'],
            $id
        ]);
    }

    // Delete a payment
    public function deletePayment($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `payments` WHERE `id` = ?");
        $stmt->execute([$id]);
    }
}
