<?php
require_once './models/t/User.php';

class UserController
{
    public $model;

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

    public function login()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || !isset($data['email']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password are required']);
            return;
        }

        $user = $this->model->getUserByEmail($data['email']);

        if (!$user || !password_verify($data['password'], $user['password'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid email or password']);
            return;
        }

        unset($user['password']);

        echo json_encode([
            'message' => 'Login successful',
            'user' => $user
        ]);
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset($data['email']) &&
            isset($data['isAdmin']) &&
            isset($data['password']) && !empty($data['password'])
        ) {
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

            $newUserId = $this->model->createUser([
                'email' => $data['email'],
                'password' => $hashedPassword,
                'name' => $data['name'] ?? null,
                'phone_number' => $data['phone_number'] ?? null,
                'isAdmin' => $data['isAdmin'],
                'billing_street' => $data['billing_street'] ?? null,
                'billing_city' => $data['billing_city'] ?? null,
                'billing_state' => $data['billing_state'] ?? null,
                'billing_postal_code' => $data['billing_postal_code'] ?? null,
                'billing_country' => $data['billing_country'] ?? null
            ]);

            http_response_code(201);
            echo json_encode([
                'message' => 'User created successfully',
                'id' => $newUserId
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input. Email, password, and isAdmin are required.']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if ($data && isset($data['email']) && isset($data['isAdmin'])) {
            $existingUser = $this->model->getUserById($id);
            if (!$existingUser) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }

            $updatedData = [
                'email' => $data['email'],
                'password' => isset($data['password']) && !empty($data['password'])
                    ? password_hash($data['password'], PASSWORD_DEFAULT)
                    : $existingUser['password'], // Keep old password if not updating
                'name' => $data['name'] ?? null,
                'phone_number' => $data['phone_number'] ?? null,
                'isAdmin' => $data['isAdmin'],
                'billing_street' => $data['billing_street'] ?? null,
                'billing_city' => $data['billing_city'] ?? null,
                'billing_state' => $data['billing_state'] ?? null,
                'billing_postal_code' => $data['billing_postal_code'] ?? null,
                'billing_country' => $data['billing_country'] ?? null
            ];

            $this->model->updateUser($id, $updatedData);

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

    // ✅ Get total user count
    public function getUserCount()
    {
        try {
            $count = $this->model->getUserCount();
            echo json_encode([
                'success' => true,
                'totalUsers' => $count
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }
}
