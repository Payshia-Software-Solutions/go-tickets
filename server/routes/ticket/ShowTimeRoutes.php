<?php
require_once './controllers/t/ShowTimeController.php';

$pdo = $GLOBALS['pdo'];
$showTimeController = new ShowTimeController($pdo);

return [
    'GET /showtimes/' => function () use ($showTimeController) {
        $showTimeController->getAllRecords();
    },
    'GET /showtimes/{id}/' => function ($id) use ($showTimeController) {
        $showTimeController->getRecordById($id);
    },
    // New route: Get showtimes by eventId
    'GET /showtimes/event/{eventId}/' => function ($eventId) use ($showTimeController) {
        $showTimeController->getRecordsByEventId($eventId);
    },
    'POST /showtimes/' => function () use ($showTimeController) {
        $showTimeController->createRecord();
    },
    'PUT /showtimes/{id}/' => function ($id) use ($showTimeController) {
        $showTimeController->updateRecord($id);
    },
    'DELETE /showtimes/{id}/' => function ($id) use ($showTimeController) {
        $showTimeController->deleteRecord($id);
    }
];
