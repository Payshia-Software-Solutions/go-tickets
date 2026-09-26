<?php
require_once './controllers/t/BookingShowtimeController.php';

$pdo = $GLOBALS['pdo'];
$bookingShowtimeController = new BookingShowtimeController($pdo);

return [

    // ✅ Get all booking_showtime records
    'GET /booking-showtimes/' => function () use ($bookingShowtimeController) {
        $bookingShowtimeController->getAllRecords();
    },

    // ✅ Get by ID
    'GET /booking-showtimes/{id}/' => function ($id) use ($bookingShowtimeController) {
        $bookingShowtimeController->getRecordById($id);
    },

    // ✅ Get by booking_id
    'GET /booking-showtimes/booking/{bookingId}/' => function ($bookingId) use ($bookingShowtimeController) {
        $bookingShowtimeController->getRecordsByBookingId($bookingId);
    },

    // ✅ Create
    'POST /booking-showtimes/' => function () use ($bookingShowtimeController) {
        $bookingShowtimeController->createRecord();
    },

    // ✅ Update
    'PUT /booking-showtimes/{id}/' => function ($id) use ($bookingShowtimeController) {
        $bookingShowtimeController->updateRecord($id);
    },

    // ✅ Delete
    'DELETE /booking-showtimes/{id}/' => function ($id) use ($bookingShowtimeController) {
        $bookingShowtimeController->deleteRecord($id);
    }
];
