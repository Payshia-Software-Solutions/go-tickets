<?php
require_once './controllers/t/SalesmanController.php';

$pdo = $GLOBALS['pdo'];
$salesmanController = new SalesmanController($pdo);

return [
    'GET /salesmen/' => function () use ($salesmanController) {
        $salesmanController->getAllRecords();
    },
    'GET /salesmen/active/' => function () use ($salesmanController) {
        $salesmanController->getActiveRecords();
    },
    'GET /salesmen/{id}/' => function ($id) use ($salesmanController) {
        $salesmanController->getRecordById($id);
    },
    'POST /salesmen/' => function () use ($salesmanController) {
        $salesmanController->createRecord();
    },
    'PUT /salesmen/{id}/' => function ($id) use ($salesmanController) {
        $salesmanController->updateRecord($id);
    },
    'DELETE /salesmen/{id}/' => function ($id) use ($salesmanController) {
        $salesmanController->deleteRecord($id);
    }
];
