<?php
require_once './models/ticket/TicketType.php';

class TicketTypeController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new TicketType($pdo);
    }

    public function getAllRecords()
    {
        $records = $this->model->getAllTicketTypes();
        echo json_encode($records);
    }

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

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if (
            $data && isset($data['id']) && isset($data['name']) && isset($data['price']) &&
            isset($data['availability']) && isset($data['eventId'])
        ) {
            $this->model->createTicketType([
                'id' => $data['id'],
                'name' => $data['name'],
                'price' => $data['price'],
                'availability' => $data['availability'],
                'description' => $data['description'] ?? null,
                'eventId' => $data['eventId']
            ]);
            http_response_code(201);
            echo json_encode(['message' => 'Ticket type created successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if (
            $data && isset($data['name']) && isset($data['price']) &&
            isset($data['availability']) && isset($data['eventId'])
        ) {
            $this->model->updateTicketType($id, [
                'name' => $data['name'],
                'price' => $data['price'],
                'availability' => $data['availability'],
                'description' => $data['description'] ?? null,
                'eventId' => $data['eventId']
            ]);
            echo json_encode(['message' => 'Ticket type updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $this->model->deleteTicketType($id);
        echo json_encode(['message' => 'Ticket type deleted successfully']);
    }
}
