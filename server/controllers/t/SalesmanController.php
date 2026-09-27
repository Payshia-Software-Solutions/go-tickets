<?php
require_once './models/t/Salesman.php';

class SalesmanController
{
    private $model;

    public function __construct($pdo)
    {
        $this->model = new Salesman($pdo);
    }

    public function getAllRecords()
    {
        if (isset($_GET['status']) && $_GET['status'] === 'active') {
            $records = $this->model->getActiveSalesmen();
        } else {
            $records = $this->model->getAllSalesmen();
        }
        echo json_encode($records);
    }

    public function getActiveRecords()
    {
        $records = $this->model->getActiveSalesmen();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getSalesmanById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Salesman not found']);
        }
    }

    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty(trim($data['name'] ?? ''))) {
            http_response_code(400);
            echo json_encode(['error' => 'Salesman name is required']);
            return;
        }

        $insertedId = $this->model->createSalesman($data);
        if ($insertedId) {
            http_response_code(201);
            echo json_encode([
                'message' => 'Salesman created successfully',
                'id' => $insertedId
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create salesman']);
        }
    }

    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
            return;
        }

        $existing = $this->model->getSalesmanById($id);
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Salesman not found']);
            return;
        }

        $success = $this->model->updateSalesman($id, $data);
        if ($success) {
            echo json_encode(['message' => 'Salesman updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update salesman']);
        }
    }

    public function deleteRecord($id)
    {
        $existing = $this->model->getSalesmanById($id);
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Salesman not found']);
            return;
        }

        $success = $this->model->deleteSalesman($id);
        if ($success) {
            echo json_encode(['message' => 'Salesman deleted successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete salesman']);
        }
    }
}
