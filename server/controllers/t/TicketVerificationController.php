<?php

require_once './models/t/TicketsVerification.php'; // Adjust the path if needed

class TicketVerificationController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new TicketVerification($pdo);
    }

    // Get all verifications
    public function getAllRecords()
    {
        $records = $this->model->getAllVerifications();
        echo json_encode($records);
    }

    // Get single verification by ID
    public function getRecordById($id)
    {
        $record = $this->model->getVerificationById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Ticket verification not found']);
        }
    }

    // Create new verification
    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset($data['booking_id'], $data['event_id'], $data['showtime_id'], $data['tickettype_id'], $data['ticket_count'], $data['checking_time'], $data['checking_by'])
        ) {
            $insertedId = $this->model->createVerification($data);
            http_response_code(201);
            echo json_encode([
                'message' => 'Ticket verification created successfully',
                'id' => $insertedId
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // Update verification
    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset($data['booking_id'], $data['event_id'], $data['showtime_id'], $data['tickettype_id'], $data['ticket_count'], $data['checking_time'], $data['checking_by'])
        ) {
            $existing = $this->model->getVerificationById($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['error' => 'Ticket verification not found']);
                return;
            }

            $this->model->updateVerification($id, $data);
            echo json_encode(['message' => 'Ticket verification updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // Delete verification
    public function deleteRecord($id)
    {
        $existing = $this->model->getVerificationById($id);
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Ticket verification not found']);
            return;
        }

        $this->model->deleteVerification($id);
        echo json_encode(['message' => 'Ticket verification deleted successfully']);
    }

    // ✅ New: Get total ticket count by booking_id, event_id, showtime_id
   // Get total ticket count from query parameters
// Get total ticket count from query parameters including tickettype_id
public function getTotalFromQuery()
{
    $booking_id = $_GET['booking_id'] ?? null;
    $event_id = $_GET['event_id'] ?? null;
    $showtime_id = $_GET['showtime_id'] ?? null;
    $tickettype_id = $_GET['tickettype_id'] ?? null;

    if ($booking_id && $event_id && $showtime_id && $tickettype_id) {
        $total = $this->model->getTotalTicketCount($booking_id, $event_id, $showtime_id, $tickettype_id);
        echo json_encode(['total_confirmed_ticket_count' => (int)$total]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing one or more required query parameters: booking_id, event_id, showtime_id, tickettype_id']);
    }
}

}
