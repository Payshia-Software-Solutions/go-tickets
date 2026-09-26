<?php
require_once './models/t/BookingEvent.php';

class BookingEventController
{
    public $model;
    private $pdo;

    public function __construct($pdo)
    {
        $this->model = new BookingEvent($pdo);
        $this->pdo = $pdo;
    }

    public function getAllRecords()
    {
        $records = $this->model->getAll();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Record not found']);
        }
    }

    public function getRecordsByBookingId($bookingId)
    {
        $records = $this->model->getByBookingId($bookingId);
        echo json_encode($records);
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset($data['booking_id'], $data['eventId'])
        ) {
            $newId = $this->model->create($data);
            $record = $this->model->getById($newId);
            http_response_code(201);
            echo json_encode([
                'message' => 'Booking event created successfully',
                'record' => $record
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset($data['booking_id'], $data['eventId'])
        ) {
            $this->model->update($id, $data);
            echo json_encode(['message' => 'Booking event updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $this->model->delete($id);
        echo json_encode(['message' => 'Booking event deleted successfully']);
    }

    // Create booking_event without output (used internally)
    public function createFromParent($data)
    {
        $this->model->create($data);
    }

    // Get booking_event records by booking_id (used internally)
    public function getByBookingIdRaw($bookingId)
    {
        return $this->model->getByBookingId($bookingId);
    }
}
