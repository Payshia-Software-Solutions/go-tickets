<?php
require_once './models/t/Category.php'; // Adjust path as needed

class CategoryController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new Category($pdo);
    }

    public function getAllRecords()
    {
        $records = $this->model->getAllCategories();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getCategoryById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Category not found']);
        }
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if ($data && isset($data['name'], $data['svg_name'])) {
            $insertedId = $this->model->createCategory($data);
            http_response_code(201);
            echo json_encode([
                'message' => 'Category created successfully',
                'id' => $insertedId
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if ($data && isset($data['name'], $data['svg_name'])) {
            $existing = $this->model->getCategoryById($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['error' => 'Category not found']);
                return;
            }

            $this->model->updateCategory($id, $data);
            echo json_encode(['message' => 'Category updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    public function deleteRecord($id)
    {
        $existing = $this->model->getCategoryById($id);
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Category not found']);
            return;
        }

        $this->model->deleteCategory($id);
        echo json_encode(['message' => 'Category deleted successfully']);
    }
}
