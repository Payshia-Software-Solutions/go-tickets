<?php

class TicketType
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all ticket types
    public function getAllTicketTypes()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `tickettype`");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ✅ NEW: Get ticket type IDs by Event ID
    public function getTicketTypeIdsByEventId($eventId)
    {
        $stmt = $this->pdo->prepare("SELECT `id` FROM `tickettype` WHERE `eventId` = ?");
        $stmt->execute([$eventId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN); // Returns array of IDs only
    }

    // Get single ticket type by ID
    public function getTicketTypeById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `tickettype` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get all ticket types by Event ID
    public function getTicketTypesByEventId($eventId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `tickettype` WHERE `eventId` = ?");
        $stmt->execute([$eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Create a new ticket type (ID is auto-incremented)
    public function createTicketType($data)
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO `tickettype` (`name`, `price`, `availability`, `description`, `eventId`, `showtimeId`)
            VALUES (:name, :price, :availability, :description, :eventId, :showtimeId)
        ");

      $stmt->execute([
    ':name' => $data['name'],
    ':price' => $data['price'],
    ':availability' => $data['availability'],
    ':description' => $data['description'] ?? null,
    ':eventId' => $data['eventId'],
    ':showtimeId' => $data['showtimeId']
]);

return $this->pdo->lastInsertId();
    }

    // Update a ticket type by ID
    public function updateTicketType($id, $data)
    {
        $stmt = $this->pdo->prepare("
            UPDATE `tickettype` SET
                `name` = :name,
                `price` = :price,
                `availability` = :availability,
                `description` = :description,
                `eventId` = :eventId,
                `showtimeId` = :showtimeId
            WHERE `id` = :id
        ");

        $stmt->execute([
            ':name' => $data['name'],
            ':price' => $data['price'],
            ':availability' => $data['availability'],
            ':description' => $data['description'] ?? null,
            ':eventId' => $data['eventId'],
            ':showtimeId' => $data['showtimeId'],
            ':id' => $id
        ]);
    }

    // Delete a ticket type by ID
    public function deleteTicketType($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `tickettype` WHERE `id` = ?");
        $stmt->execute([$id]);
    }

    public function getAvailability($eventId, $showtimeId)
    {
        $stmt = $this->pdo->prepare("
            SELECT `id`, `name`, `availability`
            FROM `tickettype` 
            WHERE `eventId` = ? AND `showtimeId` = ?
        ");
        $stmt->execute([$eventId, $showtimeId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ✅ NEW: Update ticket type by eventId and showtimeId
    public function updateAvailability($eventId, $showtimeId, $newAvailability)
    {
        $stmt = $this->pdo->prepare("
            UPDATE `tickettype` SET
                `availability` = :availability
            WHERE `eventId` = :eventId AND `showtimeId` = :showtimeId
        ");

        $stmt->execute([
            ':availability' => $newAvailability,
            ':eventId' => $eventId,
            ':showtimeId' => $showtimeId
        ]);
        
        return $stmt->rowCount(); // Returns number of affected rows
    }

    // ✅ NEW: Update availability for a specific ticket type
    public function updateAvailabilityByTicketType($eventId, $showtimeId, $ticketTypeId, $newAvailability)
    {
        $stmt = $this->pdo->prepare("
            UPDATE `tickettype` SET
                `availability` = :availability
            WHERE `eventId` = :eventId AND `showtimeId` = :showtimeId AND `id` = :ticketTypeId
        ");

        $stmt->execute([
            ':availability' => $newAvailability,
            ':eventId' => $eventId,
            ':showtimeId' => $showtimeId,
            ':ticketTypeId' => $ticketTypeId
        ]);
        
        return $stmt->rowCount(); // Returns number of affected rows
    }

    // ✅ NEW: Purchase Tickets - Reduce availability and return updated info
    public function purchaseTickets($eventId, $showtimeId, $ticketTypeId, $ticketCount)
    {
        try {
            // Start transaction for data consistency
            $this->pdo->beginTransaction();
            
            // First, get current availability and ticket info
            $stmt = $this->pdo->prepare("
                SELECT `id`, `name`, `price`, `availability`, `description`
                FROM `tickettype` 
                WHERE `eventId` = ? AND `showtimeId` = ? AND `id` = ?
                FOR UPDATE
            ");
            $stmt->execute([$eventId, $showtimeId, $ticketTypeId]);
            $ticketType = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$ticketType) {
                $this->pdo->rollback();
                return [
                    'success' => false,
                    'error' => 'Ticket type not found',
                    'code' => 'TICKET_NOT_FOUND'
                ];
            }
            
            // Check if enough tickets are available
            if ($ticketType['availability'] < $ticketCount) {
                $this->pdo->rollback();
                return [
                    'success' => false,
                    'error' => 'Not enough tickets available',
                    'code' => 'INSUFFICIENT_TICKETS',
                    'requested' => $ticketCount,
                    'available' => $ticketType['availability']
                ];
            }
            
            // Calculate new availability
            $newAvailability = $ticketType['availability'] - $ticketCount;
            
            // Update the availability
            $updateStmt = $this->pdo->prepare("
                UPDATE `tickettype` SET
                    `availability` = :availability
                WHERE `eventId` = :eventId AND `showtimeId` = :showtimeId AND `id` = :ticketTypeId
            ");
            
            $updateStmt->execute([
                ':availability' => $newAvailability,
                ':eventId' => $eventId,
                ':showtimeId' => $showtimeId,
                ':ticketTypeId' => $ticketTypeId
            ]);
            
            // Commit the transaction
            $this->pdo->commit();
            
            // Return success response with updated information
            return [
                'success' => true,
                'message' => 'Tickets purchased successfully',
                'data' => [
                    'ticketTypeId' => $ticketTypeId,
                    'eventId' => $eventId,
                    'showtimeId' => $showtimeId,
                    'ticketTypeName' => $ticketType['name'],
                    'pricePerTicket' => $ticketType['price'],
                    'ticketsPurchased' => $ticketCount,
                    'totalAmount' => $ticketType['price'] * $ticketCount,
                    'previousAvailability' => $ticketType['availability'],
                    'newAvailability' => $newAvailability,
                    'remainingTickets' => $newAvailability
                ]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage(),
                'code' => 'DATABASE_ERROR'
            ];
        }
    }

    // ✅ NEW: Get current availability for a specific ticket type
    public function getTicketTypeAvailability($eventId, $showtimeId, $ticketTypeId)
    {
        $stmt = $this->pdo->prepare("
            SELECT `id`, `name`, `price`, `availability`, `description`
            FROM `tickettype` 
            WHERE `eventId` = ? AND `showtimeId` = ? AND `id` = ?
        ");
        $stmt->execute([$eventId, $showtimeId, $ticketTypeId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // ✅ NEW: Update full ticket type data by eventId, showtimeId, and ticketTypeId
    public function updateTicketTypeByEventShowtimeAndId($eventId, $showtimeId, $ticketTypeId, $data)
    {
        $stmt = $this->pdo->prepare("
            UPDATE `tickettype` SET
                `name` = :name,
                `price` = :price,
                `availability` = :availability,
                `description` = :description
            WHERE `eventId` = :eventId AND `showtimeId` = :showtimeId AND `id` = :ticketTypeId
        ");

        $stmt->execute([
            ':name' => $data['name'],
            ':price' => $data['price'],
            ':availability' => $data['availability'],
            ':description' => $data['description'] ?? null,
            ':eventId' => $eventId,
            ':showtimeId' => $showtimeId,
            ':ticketTypeId' => $ticketTypeId
        ]);
        
        return $stmt->rowCount(); // Returns number of affected rows
    }

    // ✅ NEW: Delete ticket type by eventId and showtimeId
    public function deleteTicketTypeByEventAndShowtime($eventId, $showtimeId)
    {
        $stmt = $this->pdo->prepare("
            DELETE FROM `tickettype` 
            WHERE `eventId` = ? AND `showtimeId` = ?
        ");
        $stmt->execute([$eventId, $showtimeId]);
    }
}