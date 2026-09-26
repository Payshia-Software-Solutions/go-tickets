<?php

class TicketVerification
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all ticket verifications
    public function getAllVerifications()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `tickets_verifications`");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get ticket verification by ID
    public function getVerificationById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `tickets_verifications` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Create new ticket verification
    public function createVerification($data)
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO `tickets_verifications` 
            (`booking_id`, `event_id`, `showtime_id`, `tickettype_id`, `ticket_count`, `checking_time`, `checking_by`) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['booking_id'],
            $data['event_id'],
            $data['showtime_id'],
            $data['tickettype_id'],
            $data['ticket_count'],
            $data['checking_time'],
            $data['checking_by']
        ]);

        return $this->pdo->lastInsertId();
    }

    // Update ticket verification
    public function updateVerification($id, $data)
    {
        $stmt = $this->pdo->prepare("
            UPDATE `tickets_verifications` SET 
                `booking_id` = ?, 
                `event_id` = ?, 
                `showtime_id` = ?, 
                `tickettype_id` = ?, 
                `ticket_count` = ?, 
                `checking_time` = ?, 
                `checking_by` = ?
            WHERE `id` = ?
        ");
        $stmt->execute([
            $data['booking_id'],
            $data['event_id'],
            $data['showtime_id'],
            $data['tickettype_id'],
            $data['ticket_count'],
            $data['checking_time'],
            $data['checking_by'],
            $id
        ]);
    }

    // Delete ticket verification
    public function deleteVerification($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `tickets_verifications` WHERE `id` = ?");
        $stmt->execute([$id]);
    }

    // Get total ticket count by booking, event, and showtime
// Get total ticket count by booking, event, showtime, and ticket type
public function getTotalTicketCount($booking_id, $event_id, $showtime_id, $tickettype_id)
{
    $stmt = $this->pdo->prepare("
        SELECT SUM(`ticket_count`) AS total 
        FROM `tickets_verifications` 
        WHERE `booking_id` = ? 
          AND `event_id` = ? 
          AND `showtime_id` = ? 
          AND `tickettype_id` = ?
    ");
    $stmt->execute([$booking_id, $event_id, $showtime_id, $tickettype_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result['total'] ?? 0; // default to 0 if null
}


}
