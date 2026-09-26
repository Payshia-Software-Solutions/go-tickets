<?php

require_once './controllers/t/PaymentController.php';

$pdo = $GLOBALS['pdo'];
$paymentController = new PaymentController($pdo);

return [
    'GET /payments/' => function () use ($paymentController) {
        $paymentController->getAllRecords();
    },
    'GET /payments/{id}/' => function ($id) use ($paymentController) {
        $paymentController->getRecordById($id);
    },
    'POST /payments/' => function () use ($paymentController) {
        $paymentController->createRecord();
    },
    'PUT /payments/{id}/' => function ($id) use ($paymentController) {
        $paymentController->updateRecord($id);
    },
    'DELETE /payments/{id}/' => function ($id) use ($paymentController) {
        $paymentController->deleteRecord($id);
    },

];
