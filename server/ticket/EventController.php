<?php
require_once './models/ticket/Event.php';

class EventController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new Event($pdo);
    }

    public function getAllRecords()
    {
        $records = $this->model->getAllEvents();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getEventById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found']);
        }
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if (
            $data && isset($data['id']) && isset($data['name']) && isset($data['slug']) &&
            isset($data['date']) && isset($data['location']) && isset($data['category']) &&
            isset($data['imageUrl']) && isset($data['venueName']) && isset($data['organizerId'])
        ) {
            $this->model->createEvent([
                'id' => $data['id'],
                'name' => $data['name'],
                'slug' => $data['slug'],
                'date' => $data['date'],
                'location' => $data['location'],
                'description' => $data['description'] ?? null,
                'category' => $data['category'],
                'imageUrl' => $data['imageUrl'],
                'venueName' => $data['venueName'],
                'venueAddress' => $data['venueAddress'] ?? null,
                'organizerId' => $data['organizerId']
            ]);
            http_response_code(201);
            echo json_encode(['message' => 'Event created successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if (
            $data && isset($data['name']) && isset($data['slug']) &&
            isset($data['date']) && isset($data['location']) && isset($data['category']) &&
            isset($data['imageUrl']) && isset($data['venueName']) && isset($data['organizerId'])
        ) {
            $this->model->updateEvent($id, [
                'name' => $data['name'],
                'slug' => $data['slug'],
                'date' => $data['date'],
                'location' => $data['location'],
                'description' => $data['description'] ?? null,
                'category' => $data['category'],
                'imageUrl' => $data['imageUrl'],
                'venueName' => $data['venueName'],
                'venueAddress' => $data['venueAddress'] ?? null,
                'organizerId' => $data['organizerId']
            ]);
            echo json_encode(['message' => 'Event updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $this->model->deleteEvent($id);
        echo json_encode(['message' => 'Event deleted successfully']);
    }
}
