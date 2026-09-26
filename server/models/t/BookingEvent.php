<?php

class BookingEvent
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all booking_event records
    public function getAll()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking_event`");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get a single booking_event by ID
    public function getById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking_event` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get all events for a given booking
    public function getByBookingId($bookingId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `booking_event` WHERE `booking_id` = ?");
        $stmt->execute([$bookingId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Create a new booking_event record
    public function create($data)
    {
        $stmt = $this->pdo->prepare("INSERT INTO `booking_event` (`booking_id`, `eventId`) VALUES (?, ?)");
        $stmt->execute([
            $data['booking_id'],
            $data['eventId']
        ]);
        return $this->pdo->lastInsertId();
    }

    // Update a booking_event record
    public function update($id, $data)
    {
        $stmt = $this->pdo->prepare("UPDATE `booking_event` SET `booking_id` = ?, `eventId` = ? WHERE `id` = ?");
        $stmt->execute([
            $data['booking_id'],
            $data['eventId'],
            $id
        ]);
    }

    // Delete a booking_event record
    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `booking_event` WHERE `id` = ?");
        $stmt->execute([$id]);
    }
}
