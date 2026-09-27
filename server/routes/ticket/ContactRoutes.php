<?php
require_once './controllers/t/ContactController.php';

$pdo = $GLOBALS['pdo'];
$contactController = new ContactController($pdo);

return [
    'POST /contact/' => function () use ($contactController) {
        $contactController->submitMessage();
    },
    'GET /contact/' => function () use ($contactController) {
        $contactController->getMessages();
    }
];
