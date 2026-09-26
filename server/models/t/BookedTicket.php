<?php
class BookedTicket
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all booked tickets
    public function getAllBookedTickets()
    {
        $stmt = $this->pdo->query("SELECT * FROM `bookedticket`");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get a booked ticket by ID
    public function getBookedTicketById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `bookedticket` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Create a new booked ticket
    public function createBookedTicket($data)
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO `bookedticket` (
                `bookingId`, `eventId`, `ticketTypeId`, `ticketTypeName`,
                `quantity`, `pricePerTicket`
            ) VALUES (
                :bookingId, :eventId, :ticketTypeId, :ticketTypeName,
                :quantity, :pricePerTicket
            )
        ");

        $stmt->execute([
            ':bookingId' => $data['bookingId'],
            ':eventId' => $data['eventId'],
            ':ticketTypeId' => $data['ticketTypeId'],
            ':ticketTypeName' => $data['ticketTypeName'],
            ':quantity' => $data['quantity'],
            ':pricePerTicket' => $data['pricePerTicket'],
        ]);
    }

    // Update an existing booked ticket by ID
    public function updateBookedTicket($id, $data)
    {
        $stmt = $this->pdo->prepare("
            UPDATE `bookedticket` SET
                `bookingId` = :bookingId,
                `eventId` = :eventId,
                `ticketTypeId` = :ticketTypeId,
                `ticketTypeName` = :ticketTypeName,
                `quantity` = :quantity,
                `pricePerTicket` = :pricePerTicket
            WHERE `id` = :id
        ");

        $stmt->execute([
            ':bookingId' => $data['bookingId'],
            ':eventId' => $data['eventId'],
            ':ticketTypeId' => $data['ticketTypeId'],
            ':ticketTypeName' => $data['ticketTypeName'],
            ':quantity' => $data['quantity'],
            ':pricePerTicket' => $data['pricePerTicket'],
            ':id' => $id,
        ]);
    }

    // Delete a booked ticket by ID
    public function deleteBookedTicket($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `bookedticket` WHERE `id` = ?");
        $stmt->execute([$id]);
    }
}
