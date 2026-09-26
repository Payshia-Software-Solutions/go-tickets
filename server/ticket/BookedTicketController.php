<?php
require_once './models/ticket/BookedTicket.php';

class BookedTicketController
{
    private $model;
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->model = new BookedTicket($pdo);
    }

    public function getAllRecords()
    {
        $records = $this->model->getAllBookedTickets();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getBookedTicketById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Booked ticket not found']);
        }
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data && isset($data['id']) && isset($data['bookingId']) &&
            isset($data['eventNsid']) && isset($data['ticketTypeId']) &&
            isset($data['ticketTypeName']) && isset($data['quantity']) &&
            isset($data['pricePerTicket'])
        ) {
            // Optional: Validate bookingId exists
            $stmt = $this->pdo->prepare("SELECT id FROM Booking WHERE id = ?");
            $stmt->execute([$data['bookingId']]);
            if (!$stmt->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid bookingId']);
                return;
            }

            $this->model->createBookedTicket($data);
            http_response_code(201);
            echo json_encode(['message' => 'Booked ticket created successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data && isset($data['bookingId']) && isset($data['eventNsid']) &&
            isset($data['ticketTypeId']) && isset($data['ticketTypeName']) &&
            isset($data['quantity']) && isset($data['pricePerTicket'])
        ) {
            // Optional: Validate bookingId exists
            $stmt = $this->pdo->prepare("SELECT id FROM Booking WHERE id = ?");
            $stmt->execute([$data['bookingId']]);
            if (!$stmt->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid bookingId']);
                return;
            }

            $this->model->updateBookedTicket($id, $data);
            echo json_encode(['message' => 'Booked ticket updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $this->model->deleteBookedTicket($id);
        echo json_encode(['message' => 'Booked ticket deleted successfully']);
    }
}
