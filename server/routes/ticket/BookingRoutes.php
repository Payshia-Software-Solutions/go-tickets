<?php
require_once './controllers/t/BookingController.php';

$pdo = $GLOBALS['pdo'];
$bookingController = new BookingController($pdo);

return [
    'GET /bookings/' => function () use ($bookingController) {
        $bookingController->getAllRecords();
    },

    // ✅ New Route: Get total booking count
    'GET /bookings/get/count/' => function () use ($bookingController) {
        $bookingController->getBookingCount();
    },

    'GET /bookings/{id}/' => function ($id) use ($bookingController) {
        $bookingController->getRecordById($id);
    },

    'GET /bookings/' => function () use ($bookingController) {
        if (isset($_GET['qrvalue'])) {
            $bookingController->getRecordByQrCode($_GET['qrvalue']);
        } else {
            $bookingController->getAllRecords();
        }
    },


    // ✅ Get single booking with nested relations (booking_event + booking_showtime)
    'GET /bookings/full/{id}/' => function ($id) use ($bookingController) {
        $bookingController->getRecordByIdWithRelations($id);
    },


    // ✅ New Route: Get bookings by userId
    'GET /bookings/user/{userId}/' => function ($userId) use ($bookingController) {
        $bookingController->getRecordsByUserId($userId);
    },

    'POST /bookings/' => function () use ($bookingController) {
        $bookingController->createRecord();
    },

    'PUT /bookings/{id}/' => function ($id) use ($bookingController) {
        $bookingController->updateRecord($id);
    },

    'DELETE /bookings/{id}/' => function ($id) use ($bookingController) {
        $bookingController->deleteRecord($id);
    },
    'POST /bookings/payment/notify/' => function () use ($bookingController) {
        $bookingController->paymentNotify();
    },
    'GET /email/send-test-email/' => function () use ($bookingController) {
        $bookingController->SendOderTest();
    },
    'POST /bookings/initiatePayment/{id}/' => function ($id) use ($bookingController) {
        $bookingController->continuePayment($id);
    },

    // ✅ Installment & Slip tracking routes
    'POST /bookings/upload-slip/' => function () use ($bookingController) {
        $bookingController->uploadSlip();
    },
    'POST /bookings/{id}/add-payment/' => function ($id) use ($bookingController) {
        $bookingController->addInstallmentPayment($id);
    },
    'GET /bookings/{id}/payments/' => function ($id) use ($bookingController) {
        $bookingController->getBookingPaymentHistory($id);
    },
    'PUT /bookings/{id}/update-tickets/' => function ($id) use ($bookingController) {
        $bookingController->updateBookingTickets($id);
    },
];