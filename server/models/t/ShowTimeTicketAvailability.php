<?php

class ShowTimeTicketAvailability
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    public function getAllAvailability()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM showtimeticketavailability");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAvailabilityById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM showtimeticketavailability WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function createAvailability($data)
    {
        $stmt = $this->pdo->prepare("INSERT INTO showtimeticketavailability (
            showTimeId, ticketTypeId, availableCount
        ) VALUES (?, ?, ?)");
        $stmt->execute([
            $data['showTimeId'],
            $data['ticketTypeId'],
            $data['availableCount']
        ]);
    }

    public function updateAvailability($id, $data)
    {
        $stmt = $this->pdo->prepare("UPDATE showtimeticketavailability SET 
            showTimeId = ?, ticketTypeId = ?, availableCount = ?
            WHERE id = ?");
        $stmt->execute([
            $data['showTimeId'],
            $data['ticketTypeId'],
            $data['availableCount'],
            $id
        ]);
    }

    public function deleteAvailability($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM showtimeticketavailability WHERE id = ?");
        $stmt->execute([$id]);
    }
}
?>
