<?php

class Event
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all events
    public function getAllEvents()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `event` ORDER BY `id` DESC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get event by ID
    public function getEventById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `event` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get event by slug
    public function getEventBySlug($slug)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `event` WHERE `slug` = ?");
        $stmt->execute([$slug]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Create new event (auto-generate slug from name)
    public function createEvent($data)
    {
        $slug = $this->generateSlug($data['name']);

        $stmt = $this->pdo->prepare("INSERT INTO `event` (
            `name`, `slug`, `date`, `location`, `description`, `category`, 
            `imageUrl`, `venueName`, `venueAddress`, `organizerId`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmt->execute([
            $data['name'],
            $slug,
            $data['date'],
            $data['location'],
            $data['description'],
            $data['category'],
            $data['imageUrl'],
            $data['venueName'],
            $data['venueAddress'],
            $data['organizerId']
        ]);

        return $this->pdo->lastInsertId();
    }

    // Update event
    public function updateEvent($id, $data)
    {
        $slug = $this->generateSlug($data['name']);

        $stmt = $this->pdo->prepare("UPDATE `event` SET 
            `name` = ?, `slug` = ?, `date` = ?, `location` = ?, `description` = ?, 
            `category` = ?, `imageUrl` = ?, `venueName` = ?, `venueAddress` = ?, `organizerId` = ?
            WHERE `id` = ?");

        $stmt->execute([
            $data['name'],
            $slug,
            $data['date'],
            $data['location'],
            $data['description'],
            $data['category'],
            $data['imageUrl'],
            $data['venueName'],
            $data['venueAddress'],
            $data['organizerId'],
            $id
        ]);
    }

    // Delete event
    public function deleteEvent($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `event` WHERE `id` = ?");
        $stmt->execute([$id]);
    }

    // Generate slug from name
    private function generateSlug($name)
    {
        // Convert to lowercase, remove non-alphanumeric characters, replace spaces with hyphens
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
        $slug = preg_replace('/[\s-]+/', '-', $slug);
        return $slug;
    }


    public function filterEvents($filters = [])
    {
        $sql = "SELECT * FROM `event` WHERE 1=1";
        $params = [];

        // Filter by location
        if (!empty($filters['location'])) {
            $sql .= " AND (`location` LIKE ? OR `venueName` LIKE ? OR `venueAddress` LIKE ?)";
            $locationParam = '%' . $filters['location'] . '%';
            $params[] = $locationParam;
            $params[] = $locationParam;
            $params[] = $locationParam;
        }

        // Filter by category
        if (!empty($filters['category'])) {
            $sql .= " AND `category` LIKE ?";
            $params[] = '%' . $filters['category'] . '%';
        }

        // Filter by date
        if (!empty($filters['date'])) {
            // Handle different date formats
            if ($this->isValidDate($filters['date'])) {
                $sql .= " AND DATE(`date`) = ?";
                $params[] = $filters['date'];
            } else {
                // If not a valid date, search in date field as text
                $sql .= " AND `date` LIKE ?";
                $params[] = '%' . $filters['date'] . '%';
            }
        }

        // Add ordering
        $sql .= " ORDER BY `date` ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function isValidDate($date)
    {
        $formats = ['Y-m-d', 'Y/m/d', 'm/d/Y', 'd/m/Y', 'Y-m-d H:i:s'];

        foreach ($formats as $format) {
            $dateTime = DateTime::createFromFormat($format, $date);
            if ($dateTime && $dateTime->format($format) === $date) {
                return true;
            }
        }

        return false;
    }


    // Search events by name only using wildcard
    public function searchEventsByName($searchTerm)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `event` WHERE `name` LIKE ? ORDER BY `name` ASC");
        $searchParam = '%' . $searchTerm . '%';
        $stmt->execute([$searchParam]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Comprehensive search (name, description, venue, category)
    public function searchEvents($searchTerm)
    {
        $stmt = $this->pdo->prepare("
        SELECT * FROM `event` 
        WHERE `name` LIKE ? 
           OR `description` LIKE ? 
           OR `venueName` LIKE ? 
           OR `category` LIKE ?
        ORDER BY `name` ASC
    ");
        $searchParam = '%' . $searchTerm . '%';
        $stmt->execute([$searchParam, $searchParam, $searchParam, $searchParam]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }



    // Get total count of events
    public function getEventCount()
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS total FROM `event`");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['total'];
    }

    public function getBookedTicketsCount($eventId, $showtimeId, $ticketTypeId)
    {
        $stmt = $this->pdo->prepare("
       SELECT 
    SUM(bs.ticket_count) AS booked_count
FROM 
    booking_showtime bs
JOIN 
    booking b ON bs.booking_id = b.id
WHERE 
    bs.eventId = ?
    AND bs.showtime_id = ?
    AND bs.tickettype_id = ?
    AND b.payment_status = 'paid';

    ");
        $stmt->execute([$eventId, $showtimeId, $ticketTypeId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['booked_count'] ?? 0; // Return 0 if no bookings found
    }


    public function releasedTicketsCount($eventId, $showtimeId, $ticketTypeId)
    {
        $stmt = $this->pdo->prepare("
     SELECT `availability` FROM `tickettype` WHERE `eventId` = ? AND `showtimeId`= ? AND `id` = ?
    ");
        $stmt->execute([$eventId, $showtimeId, $ticketTypeId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['availability'] ?? 0; // Return 0 if no bookings found
    }
}
