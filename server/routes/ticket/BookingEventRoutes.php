<?php
require_once './controllers/t/BookingEventController.php';

$pdo = $GLOBALS['pdo'];
$bookingEventController = new BookingEventController($pdo);

return [

    // ✅ Get all booking_event records
    'GET /booking-events/' => function () use ($bookingEventController) {
        $bookingEventController->getAllRecords();
    },

    // ✅ Get a single booking_event by ID
    'GET /booking-events/{id}/' => function ($id) use ($bookingEventController) {
        $bookingEventController->getRecordById($id);
    },

    // ✅ Get all booking_events for a specific booking_id
    'GET /booking-events/booking/{bookingId}/' => function ($bookingId) use ($bookingEventController) {
        $bookingEventController->getRecordsByBookingId($bookingId);
    },

    // ✅ Create a new booking_event record
    'POST /booking-events/' => function () use ($bookingEventController) {
        $bookingEventController->createRecord();
    },

    // ✅ Update an existing booking_event
    'PUT /booking-events/{id}/' => function ($id) use ($bookingEventController) {
        $bookingEventController->updateRecord($id);
    },

    // ✅ Delete a booking_event record
    'DELETE /booking-events/{id}/' => function ($id) use ($bookingEventController) {
        $bookingEventController->deleteRecord($id);
    }

];
