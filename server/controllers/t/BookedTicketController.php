<?php
require_once './models/t/BookedTicket.php';

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
            $data &&
            isset($data['bookingId'], $data['eventId'], $data['ticketTypeId'], $data['ticketTypeName'], $data['quantity'], $data['pricePerTicket'])
        ) {
            // Validate foreign keys
            if (!$this->existsInTable('booking', $data['bookingId'])) {
                return $this->respondBadRequest('Invalid bookingId');
            }
            if (!$this->existsInTable('event', $data['eventId'])) {
                return $this->respondBadRequest('Invalid eventId');
            }
            if (!$this->existsInTable('ticketType', $data['ticketTypeId'])) {
                return $this->respondBadRequest('Invalid ticketTypeId');
            }

            try {
                $this->model->createBookedTicket($data);
                http_response_code(201);
                echo json_encode(['message' => 'Booked ticket created successfully']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
            }
        } else {
            $this->respondBadRequest('Invalid input');
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset($data['bookingId'], $data['eventId'], $data['ticketTypeId'], $data['ticketTypeName'], $data['quantity'], $data['pricePerTicket'])
        ) {
            // Validate foreign keys
            if (!$this->existsInTable('booking', $data['bookingId'])) {
                return $this->respondBadRequest('Invalid bookingId');
            }
            if (!$this->existsInTable('event', $data['eventId'])) {
                return $this->respondBadRequest('Invalid eventId');
            }
            if (!$this->existsInTable('ticketType', $data['ticketTypeId'])) {
                return $this->respondBadRequest('Invalid ticketTypeId');
            }

            try {
                $this->model->updateBookedTicket($id, $data);
                echo json_encode(['message' => 'Booked ticket updated successfully']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
            }
        } else {
            $this->respondBadRequest('Invalid input');
        }
    }

    public function deleteRecord($id)
    {
        try {
            $this->model->deleteBookedTicket($id);
            echo json_encode(['message' => 'Booked ticket deleted successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }

    private function existsInTable(string $table, $id): bool
    {
        $stmt = $this->pdo->prepare("SELECT id FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        return (bool) $stmt->fetch();
    }

    private function respondBadRequest(string $message)
    {
        http_response_code(400);
        echo json_encode(['error' => $message]);
    }
}
