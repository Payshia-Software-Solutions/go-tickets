<?php
require_once './modes/ticket/Organizer.php';

class OrganizerController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new Organizer($pdo);
    }

    // Get all records
    public function getAllRecords()
    {
        $records = $this->model->getAllOrganizers();
        echo json_encode($records);
    }

    // Get record by ID
    public function getRecordById($id)
    {
        $record = $this->model->getOrganizerById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Organizer not found']);
        }
    }

    // Create new organizer
    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if ($data && isset($data['id']) && isset($data['name']) && isset($data['contactEmail'])) {
            $this->model->createOrganizer([
                'id' => $data['id'],
                'name' => $data['name'],
                'contactEmail' => $data['contactEmail'],
                'website' => $data['website'] ?? null
            ]);
            http_response_code(201);
            echo json_encode(['message' => 'Organizer created successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // Update organizer
    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if ($data && isset($data['name']) && isset($data['contactEmail'])) {
            $this->model->updateOrganizer($id, [
                'name' => $data['name'],
                'contactEmail' => $data['contactEmail'],
                'website' => $data['website'] ?? null
            ]);
            echo json_encode(['message' => 'Organizer updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // Delete organizer
    public function deleteRecord($id)
    {
        $this->model->deleteOrganizer($id);
        echo json_encode(['message' => 'Organizer deleted successfully']);
    }
}
