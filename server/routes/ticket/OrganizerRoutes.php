<?php

require_once './controllers/t/OrganizerController.php';

$pdo = $GLOBALS['pdo'];
$organizerController = new OrganizerController($pdo);

return [
    'GET /organizers/' => function () use ($organizerController) {
        $organizerController->getAllRecords();
    },
    'GET /organizers/{id}/' => function ($id) use ($organizerController) {
        $organizerController->getRecordById($id);
    },
    'POST /organizers/' => function () use ($organizerController) {
        $organizerController->createRecord();
    },
    'PUT /organizers/{id}/' => function ($id) use ($organizerController) {
        $organizerController->updateRecord($id);
    },
    'DELETE /organizers/{id}/' => function ($id) use ($organizerController) {
        $organizerController->deleteRecord($id);
    }
];
