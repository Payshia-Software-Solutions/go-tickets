<?php
require_once './controllers/t/CategoryController.php';

$pdo = $GLOBALS['pdo'];
$categoryController = new CategoryController($pdo);

return [
    'GET /categories/' => function () use ($categoryController) {
        $categoryController->getAllRecords();
    },
    'GET /categories/{id}/' => function ($id) use ($categoryController) {
        $categoryController->getRecordById($id);
    },
    'POST /categories/' => function () use ($categoryController) {
        $categoryController->createRecord();
    },
    'PUT /categories/{id}/' => function ($id) use ($categoryController) {
        $categoryController->updateRecord($id);
    },
    'DELETE /categories/{id}/' => function ($id) use ($categoryController) {
        $categoryController->deleteRecord($id);
    }
];
