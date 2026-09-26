<?php
require_once './models/t/BookingShowtime.php';

class BookingShowtimeController
{
    public $model;
    private $pdo;

    public function __construct($pdo)
    {
        $this->model = new BookingShowtime($pdo);
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
            isset(
                $data['booking_id'],
                $data['eventId'],
                $data['showtime_id'],
                $data['ticket_type'],
                $data['tickettype_id'],
                $data['showtime'],
                $data['ticket_count']
            )
        ) {
            $newId = $this->model->create($data);
            $record = $this->model->getById($newId);
            http_response_code(201);
            echo json_encode([
                'message' => 'Booking showtime created successfully',
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
            isset(
                $data['booking_id'],
                $data['eventId'],
                $data['showtime_id'],
                $data['ticket_type'],
                $data['tickettype_id'],
                $data['showtime'],
                $data['ticket_count']
            )
        ) {
            $this->model->update($id, $data);
            echo json_encode(['message' => 'Booking showtime updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $this->model->delete($id);
        echo json_encode(['message' => 'Booking showtime deleted successfully']);
    }

    public function createFromParent($data)
    {
        $this->model->create($data);
    }

    public function getByBookingAndEventRaw($bookingId, $eventId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM booking_showtime WHERE booking_id = ? AND eventId = ?");
        $stmt->execute([$bookingId, $eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
