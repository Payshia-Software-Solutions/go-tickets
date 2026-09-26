<?php

class BookingShowtime
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all booking_showtime records
    public function getAll()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking_showtime`");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get a single record by ID
    public function getById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking_showtime` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get by booking_id
    public function getByBookingId($bookingId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking_showtime` WHERE `booking_id` = ?");
        $stmt->execute([$bookingId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByBookingAndEventRaw($bookingId, $eventId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking_showtime` WHERE `booking_id` = ? AND `eventId` = ?");
        $stmt->execute([$bookingId, $eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Create a new record
    public function create($data)
    {
        $stmt = $this->pdo->prepare("INSERT INTO `booking_showtime` (
            `booking_id`, `eventId`, `showtime_id`, `ticket_type`, `tickettype_id`, `showtime`, `ticket_count`
        ) VALUES (?, ?, ?, ?, ?, ?, ?)");

        $stmt->execute([
            $data['booking_id'],
            $data['eventId'],
            $data['showtime_id'],
            $data['ticket_type'],
            $data['tickettype_id'],
            $data['showtime'],
            $data['ticket_count']
        ]);

        return $this->pdo->lastInsertId();
    }

    // Update a record
    public function update($id, $data)
    {
        $stmt = $this->pdo->prepare("UPDATE `booking_showtime` SET
            `booking_id` = ?, `eventId` = ?, `showtime_id` = ?, `ticket_type` = ?, `tickettype_id` = ?, `showtime` = ?, `ticket_count` = ?
            WHERE `id` = ?");

        $stmt->execute([
            $data['booking_id'],
            $data['eventId'],
            $data['showtime_id'],
            $data['ticket_type'],
            $data['tickettype_id'],
            $data['showtime'],
            $data['ticket_count'],
            $id
        ]);
    }

    // Delete a record
    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `booking_showtime` WHERE `id` = ?");
        $stmt->execute([$id]);
    }
}
