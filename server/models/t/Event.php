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

    // Get featured banner event
    public function getFeaturedEvent()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `event` WHERE `is_featured` = 1 ORDER BY `id` DESC LIMIT 1");
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Toggle or update accept_booking
    public function updateAcceptBooking($id, $accept_booking)
    {
        $stmt = $this->pdo->prepare("UPDATE `event` SET `accept_booking` = ? WHERE `id` = ?");
        $stmt->execute([(int)$accept_booking, $id]);
    }

    // Set or unset featured event
    public function setFeaturedEvent($id, $is_featured, $badge = null, $description = null)
    {
        if ($is_featured) {
            // Unset all other events first so only one is featured
            $this->pdo->exec("UPDATE `event` SET `is_featured` = 0");
            $stmt = $this->pdo->prepare("UPDATE `event` SET `is_featured` = 1, `featured_badge` = ?, `featured_description` = ? WHERE `id` = ?");
            $stmt->execute([$badge, $description, $id]);
        } else {
            $stmt = $this->pdo->prepare("UPDATE `event` SET `is_featured` = 0 WHERE `id` = ?");
            $stmt->execute([$id]);
        }
    }

    // Create new event (auto-generate slug from name)
    public function createEvent($data)
    {
        $slug = $this->generateSlug($data['name']);
        $accept_booking = isset($data['accept_booking']) ? (int)$data['accept_booking'] : 1;
        $is_featured = isset($data['is_featured']) ? (int)$data['is_featured'] : 0;
        $featured_badge = $data['featured_badge'] ?? null;
        $featured_description = $data['featured_description'] ?? null;

        if ($is_featured) {
            $this->pdo->exec("UPDATE `event` SET `is_featured` = 0");
        }

        $stmt = $this->pdo->prepare("INSERT INTO `event` (
            `name`, `slug`, `date`, `location`, `description`, `category`, 
            `imageUrl`, `venueName`, `venueAddress`, `organizerId`,
            `accept_booking`, `is_featured`, `featured_badge`, `featured_description`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

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
            $accept_booking,
            $is_featured,
            $featured_badge,
            $featured_description
        ]);

        return $this->pdo->lastInsertId();
    }

    // Update event
    public function updateEvent($id, $data)
    {
        $slug = $this->generateSlug($data['name']);

        $fields = [
            "`name` = ?", "`slug` = ?", "`date` = ?", "`location` = ?", "`description` = ?", 
            "`category` = ?", "`imageUrl` = ?", "`venueName` = ?", "`venueAddress` = ?", "`organizerId` = ?"
        ];
        $params = [
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
        ];

        if (isset($data['accept_booking'])) {
            $fields[] = "`accept_booking` = ?";
            $params[] = (int)$data['accept_booking'];
        }

        if (isset($data['is_featured'])) {
            $is_featured = (int)$data['is_featured'];
            if ($is_featured === 1) {
                $this->pdo->exec("UPDATE `event` SET `is_featured` = 0");
            }
            $fields[] = "`is_featured` = ?";
            $params[] = $is_featured;
        }

        if (array_key_exists('featured_badge', $data)) {
            $fields[] = "`featured_badge` = ?";
            $params[] = $data['featured_badge'];
        }

        if (array_key_exists('featured_description', $data)) {
            $fields[] = "`featured_description` = ?";
            $params[] = $data['featured_description'];
        }

        $params[] = $id;
        $sql = "UPDATE `event` SET " . implode(", ", $fields) . " WHERE `id` = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
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
