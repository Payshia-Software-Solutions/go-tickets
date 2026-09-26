<?php
require_once './models/t/TicketType.php';

class TicketTypeController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new TicketType($pdo);
    }

    // Get all ticket types
    public function getAllRecords()
    {
        $records = $this->model->getAllTicketTypes();
        echo json_encode($records);
    }

    // Get ticket type by ID
    public function getRecordById($id)
    {
        $record = $this->model->getTicketTypeById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Ticket type not found']);
        }
    }

    // Get ticket types by Event ID
    public function getRecordsByEventId($eventId)
    {
        $records = $this->model->getTicketTypesByEventId($eventId);
        if ($records) {
            echo json_encode($records);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'No ticket types found for this event']);
        }
    }

    // ✅ NEW: Get ticket type IDs by Event ID
    public function getTicketTypeIdsByEventId($eventId)
    {
        try {
            $ids = $this->model->getTicketTypeIdsByEventId($eventId);
            
            if ($ids && count($ids) > 0) {
                echo json_encode([
                    'success' => true,
                    'data' => $ids,
                    'count' => count($ids)
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'No ticket types found for this event',
                    'eventId' => $eventId
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    // Create a new ticket type (supports showtimeId)
    public function createRecord()
{
    $data = json_decode(file_get_contents("php://input"), true);

    if (
        $data &&
        isset($data['name']) &&
        isset($data['price']) &&
        isset($data['availability']) &&
        isset($data['eventId']) &&
        isset($data['showtimeId'])
    ) {
        try {
            $insertedId = $this->model->createTicketType([
                'name' => $data['name'],
                'price' => $data['price'],
                'availability' => $data['availability'],
                'description' => $data['description'] ?? null,
                'eventId' => $data['eventId'],
                'showtimeId' => $data['showtimeId']
            ]);
            http_response_code(201);
            echo json_encode([
                'message' => 'Ticket type created successfully',
                'id' => $insertedId
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input']);
    }
}


    // Update an existing ticket type by ID (supports showtimeId)
    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset($data['name']) &&
            isset($data['price']) &&
            isset($data['availability']) &&
            isset($data['eventId']) &&
            isset($data['showtimeId'])
        ) {
            try {
                $this->model->updateTicketType($id, [
                    'name' => $data['name'],
                    'price' => $data['price'],
                    'availability' => $data['availability'],
                    'description' => $data['description'] ?? null,
                    'eventId' => $data['eventId'],
                    'showtimeId' => $data['showtimeId']
                ]);
                echo json_encode(['message' => 'Ticket type updated successfully']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // Delete a ticket type by ID
    public function deleteRecord($id)
    {
        try {
            $this->model->deleteTicketType($id);
            echo json_encode(['message' => 'Ticket type deleted successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }

    public function getAvailability($eventId, $showtimeId)
    {
        try {
            // Get the availability data from the model
            $record = $this->model->getAvailability($eventId, $showtimeId);
            
            // Check if we got any results
            if ($record && count($record) > 0) {
                // Return the availability data
                echo json_encode([
                    'success' => true,
                    'data' => $record
                ]);
            } else {
                // No data found
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'No ticket types found for the specified event and showtime',
                    'eventId' => $eventId,
                    'showtimeId' => $showtimeId
                ]);
            }
        } catch (Exception $e) {
            // Handle any database or other errors
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    public function updateAvailability($eventId, $showtimeId, $ticketTypeId = null)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if ($data && isset($data['availability'])) {
            try {
                if ($ticketTypeId) {
                    // Update specific ticket type
                    $affectedRows = $this->model->updateAvailabilityByTicketType($eventId, $showtimeId, $ticketTypeId, $data['availability']);
                } else {
                    // Update all ticket types for this showtime (original behavior)
                    $affectedRows = $this->model->updateAvailability($eventId, $showtimeId, $data['availability']);
                }
                
                if ($affectedRows > 0) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Availability updated successfully',
                        'affectedRows' => $affectedRows
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error' => 'No ticket type found for the specified parameters'
                    ]);
                }
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Server error: ' . $e->getMessage()
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Missing availability value'
            ]);
        }
    }

    // ✅ NEW: Purchase Tickets - Reduce availability and return updated info
 public function purchaseTickets($eventId, $showtimeId, $ticketTypeId)
{
    // Get ticketCount from URL parameter instead of JSON body
    if (!isset($_GET['ticketCount'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required parameter: ticketCount'
        ]);
        return;
    }

    $ticketCount = intval($_GET['ticketCount']);

    // Validate ticketCount is positive
    if ($ticketCount <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Ticket count must be greater than 0'
        ]);
        return;
    }

    try {
        // Call the model method to purchase tickets
        $result = $this->model->purchaseTickets($eventId, $showtimeId, $ticketTypeId, $ticketCount);
        
        if ($result['success']) {
            http_response_code(200);
            echo json_encode($result);
        } else {
            // Set appropriate HTTP status code based on error type
            switch ($result['code']) {
                case 'TICKET_NOT_FOUND':
                    http_response_code(404);
                    break;
                case 'INSUFFICIENT_TICKETS':
                    http_response_code(409); // Conflict
                    break;
                case 'DATABASE_ERROR':
                default:
                    http_response_code(500);
                    break;
            }
            echo json_encode($result);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Server error: ' . $e->getMessage(),
            'code' => 'SERVER_ERROR'
        ]);
    }
}

    // ✅ NEW: Get specific ticket type availability
    public function getTicketTypeAvailability($eventId, $showtimeId, $ticketTypeId)
    {
        try {
            $ticketType = $this->model->getTicketTypeAvailability($eventId, $showtimeId, $ticketTypeId);
            
            if ($ticketType) {
                echo json_encode([
                    'success' => true,
                    'data' => $ticketType
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Ticket type not found',
                    'eventId' => $eventId,
                    'showtimeId' => $showtimeId,
                    'ticketTypeId' => $ticketTypeId
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    // ✅ NEW: Update full ticket type data by eventId, showtimeId, and ticketTypeId
    public function updateRecordByEventShowtimeAndId($eventId, $showtimeId, $ticketTypeId)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset($data['name']) &&
            isset($data['price']) &&
            isset($data['availability'])
        ) {
            try {
                $affectedRows = $this->model->updateTicketTypeByEventShowtimeAndId($eventId, $showtimeId, $ticketTypeId, [
                    'name' => $data['name'],
                    'price' => $data['price'],
                    'availability' => $data['availability'],
                    'description' => $data['description'] ?? null
                ]);
                
                if ($affectedRows > 0) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Ticket type updated successfully',
                        'affectedRows' => $affectedRows
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error' => 'No ticket type found for the specified event, showtime, and ticket type ID'
                    ]);
                }
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Server error: ' . $e->getMessage()
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Missing required fields: name, price, availability'
            ]);
        }
    }

    // ✅ NEW: Delete ticket type by eventId and showtimeId
    public function deleteByEventAndShowtime($eventId, $showtimeId)
    {
        try {
            $this->model->deleteTicketTypeByEventAndShowtime($eventId, $showtimeId);
            echo json_encode(['message' => 'Ticket type deleted successfully (by Event and Showtime)']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }
}