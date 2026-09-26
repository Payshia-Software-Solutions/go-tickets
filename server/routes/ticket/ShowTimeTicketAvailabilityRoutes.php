<?php
require_once './controllers/t/ShowTimeTicketAvailabilityController.php';

$showTimeTicketAvailabilityController = new ShowTimeTicketAvailabilityController($pdo);

return [
    'GET /availability/' => function () use ($showTimeTicketAvailabilityController) {
        $showTimeTicketAvailabilityController->getAllRecords();
    },
    'GET /availability/{id}/' => function ($id) use ($showTimeTicketAvailabilityController) {
        $showTimeTicketAvailabilityController->getRecordById($id);
    },
    'POST /availability/' => function () use ($showTimeTicketAvailabilityController) {
        $showTimeTicketAvailabilityController->createRecord();
    },
    'PUT /availability/{id}/' => function ($id) use ($showTimeTicketAvailabilityController) {
        $showTimeTicketAvailabilityController->updateRecord($id);
    },
    'DELETE /availability/{id}/' => function ($id) use ($showTimeTicketAvailabilityController) {
        $showTimeTicketAvailabilityController->deleteRecord($id);
    }
];
?>