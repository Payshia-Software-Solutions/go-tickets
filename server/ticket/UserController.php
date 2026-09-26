<?php
require_once './models/ticket/User.php';

class UserController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new User($pdo);
    }

    public function getAllRecords()
    {
        $records = $this->model->getAllUsers();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getUserById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
        }
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if ($data && isset($data['id']) && isset($data['email']) && isset($data['isAdmin'])) {
            $this->model->createUser([
                'id' => $data['id'],
                'email' => $data['email'],
                'name' => $data['name'] ?? null,
                'isAdmin' => $data['isAdmin']
            ]);
            http_response_code(201);
            echo json_encode(['message' => 'User created successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if ($data && isset($data['email']) && isset($data['isAdmin'])) {
            $this->model->updateUser($id, [
                'email' => $data['email'],
                'name' => $data['name'] ?? null,
                'isAdmin' => $data['isAdmin']
            ]);
            echo json_encode(['message' => 'User updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $this->model->deleteUser($id);
        echo json_encode(['message' => 'User deleted successfully']);
    }
}
