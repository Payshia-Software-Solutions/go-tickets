<?php
require_once './controllers/t/BookedTicketController.php';

$pdo = $GLOBALS['pdo'];
$bookedTicketController = new BookedTicketController($pdo);

return [
    'GET /booked-tickets/' => function () use ($bookedTicketController) {
        $bookedTicketController->getAllRecords();
    },
    'GET /booked-tickets/{id}/' => function ($id) use ($bookedTicketController) {
        $bookedTicketController->getRecordById($id);
    },
    'POST /booked-tickets/' => function () use ($bookedTicketController) {
        $bookedTicketController->createRecord();
    },
    'PUT /booked-tickets/{id}/' => function ($id) use ($bookedTicketController) {
        $bookedTicketController->updateRecord($id);
    },
    'DELETE /booked-tickets/{id}/' => function ($id) use ($bookedTicketController) {
        $bookedTicketController->deleteRecord($id);
    }
];
