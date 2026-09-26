<?php
require_once './models/ticket/Booking.php';

class BookingController
{
    private $model;
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->model = new Booking($pdo);
    }

    public function getAllRecords()
    {
        $records = $this->model->getAllBookings();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getBookingById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found']);
        }
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data && isset($data['id']) && isset($data['userId']) && isset($data['eventId']) &&
            isset($data['totalPrice']) && isset($data['bookingDate']) &&
            isset($data['eventName']) && isset($data['eventDate']) &&
            isset($data['eventLocation']) && isset($data['qrCodeValue'])
        ) {
            // Validate userId
            $userStmt = $this->pdo->prepare("SELECT id FROM User WHERE id = ?");
            $userStmt->execute([$data['userId']]);
            if (!$userStmt->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid userId']);
                return;
            }

            // Validate eventId
            $eventStmt = $this->pdo->prepare("SELECT id FROM Event WHERE id = ?");
            $eventStmt->execute([$data['eventId']]);
            if (!$eventStmt->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid eventId']);
                return;
            }

            // If both foreign keys are valid
            $this->model->createBooking($data);
            http_response_code(201);
            echo json_encode(['message' => 'Booking created successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data && isset($data['userId']) && isset($data['eventId']) &&
            isset($data['totalPrice']) && isset($data['bookingDate']) &&
            isset($data['eventName']) && isset($data['eventDate']) &&
            isset($data['eventLocation']) && isset($data['qrCodeValue'])
        ) {
            // Validate userId
            $userStmt = $this->pdo->prepare("SELECT id FROM User WHERE id = ?");
            $userStmt->execute([$data['userId']]);
            if (!$userStmt->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid userId']);
                return;
            }

            // Validate eventId
            $eventStmt = $this->pdo->prepare("SELECT id FROM Event WHERE id = ?");
            $eventStmt->execute([$data['eventId']]);
            if (!$eventStmt->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid eventId']);
                return;
            }

            // If both foreign keys are valid
            $this->model->updateBooking($id, $data);
            echo json_encode(['message' => 'Booking updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $this->model->deleteBooking($id);
        echo json_encode(['message' => 'Booking deleted successfully']);
    }
}
