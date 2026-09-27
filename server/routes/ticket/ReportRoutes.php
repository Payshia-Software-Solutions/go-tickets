<?php
require_once './controllers/t/ReportController.php';

$pdo = $GLOBALS['pdo'];
$reportController = new ReportController($pdo);

return [
    // Download Dompdf Event Report PDF directly
    'GET /reports/event-summary/pdf/' => function () use ($reportController) {
        $reportController->downloadPdf();
    },

    // Email Dompdf Event Report PDF to Director / Management
    'POST /reports/event-summary/email/' => function () use ($reportController) {
        $reportController->emailReport();
    },
];
