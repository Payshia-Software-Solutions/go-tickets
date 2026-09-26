<?php
require_once './models/t/ShowTimeTicketAvailability.php';

class ShowTimeTicketAvailabilityController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new ShowTimeTicketAvailability($pdo);
    }

    public function getAllRecords()
    {
        $records = $this->model->getAllAvailability();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getAvailabilityById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Availability record not found']);
        }
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if ($data && isset($data['showTimeId'], $data['ticketTypeId'], $data['availableCount'])) {
            $this->model->createAvailability($data);
            http_response_code(201);
            echo json_encode(['message' => 'Availability created successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if ($data && isset($data['showTimeId'], $data['ticketTypeId'], $data['availableCount'])) {
            $this->model->updateAvailability($id, $data);
            echo json_encode(['message' => 'Availability updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $this->model->deleteAvailability($id);
        echo json_encode(['message' => 'Availability deleted successfully']);
    }
}
?>
