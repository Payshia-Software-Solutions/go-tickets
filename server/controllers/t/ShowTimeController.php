<?php

require_once './models/t/ShowTime.php';

class ShowTimeController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new ShowTime($pdo);
    }

    // Get all showtimes
    public function getAllRecords()
    {
        $records = $this->model->getAllShowTimes();
        echo json_encode($records);
    }

    // Get a single showtime by ID
    public function getRecordById($id)
    {
        $record = $this->model->getShowTimeById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'ShowTime not found']);
        }
    }

    // Get showtimes by Event ID
    public function getRecordsByEventId($eventId)
    {
        $records = $this->model->getShowTimesByEventId($eventId);
        if ($records) {
            echo json_encode($records);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'No showtimes found for this Event ID']);
        }
    }

    // Create a new showtime and return the created ID
    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if ($data && isset($data['eventId']) && isset($data['dateTime'])) {
            $createdId = $this->model->createShowTime($data);

            http_response_code(201);
            echo json_encode([
                'message' => 'ShowTime created successfully',
                'showtimeId' => $createdId
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // Update an existing showtime
    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if ($data && isset($data['eventId']) && isset($data['dateTime'])) {
            $this->model->updateShowTime($id, $data);
            echo json_encode(['message' => 'ShowTime updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // Delete a showtime
    public function deleteRecord($id)
    {
        $this->model->deleteShowTime($id);
        echo json_encode(['message' => 'ShowTime deleted successfully']);
    }
}
