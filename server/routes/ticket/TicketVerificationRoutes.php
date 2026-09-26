<?php

require_once './controllers/t/TicketVerificationController.php';

$pdo = $GLOBALS['pdo'];
$ticketVerificationController = new TicketVerificationController($pdo);

return [

    // Get all ticket verifications
    'GET /tickets-verifications/' => function () use ($ticketVerificationController) {
        $ticketVerificationController->getAllRecords();
    },

       // ✅ Get total ticket count via query string
    'GET /tickets-verifications/total' => function () use ($ticketVerificationController) {
        $ticketVerificationController->getTotalFromQuery();
    },

    // Get single verification by ID
    'GET /tickets-verifications/{id}/' => function ($id) use ($ticketVerificationController) {
        $ticketVerificationController->getRecordById($id);
    },

    // Create new ticket verification
    'POST /tickets-verifications/' => function () use ($ticketVerificationController) {
        $ticketVerificationController->createRecord();
    },

    // Update ticket verification
    'PUT /tickets-verifications/{id}/' => function ($id) use ($ticketVerificationController) {
        $ticketVerificationController->updateRecord($id);
    },

    // Delete ticket verification
    'DELETE /tickets-verifications/{id}/' => function ($id) use ($ticketVerificationController) {
        $ticketVerificationController->deleteRecord($id);
    }

 

];
