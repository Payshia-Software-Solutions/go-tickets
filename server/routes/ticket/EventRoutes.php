<?php
require_once './controllers/t/EventController.php';

$pdo = $GLOBALS['pdo'];
$eventController = new EventController($pdo);

return [
    'GET /events/' => function () use ($eventController) {
        $eventController->getAllRecords();
    },

    // ✅ Put specific routes BEFORE generic {id} route
    'GET /events/filter/' => function () use ($eventController) {
        $eventController->filterEvents();
    },

    'POST /events/filter/' => function () use ($eventController) {
        $eventController->filterEvents();
    },

    // ✅ Comprehensive search (name, description, venue, category)
'GET /events/search/' => function () use ($eventController) {
    $eventController->searchEvents();
},

// ✅ Search by name only
'GET /events/search/name/' => function () use ($eventController) {
    $eventController->searchByName();
},

    'GET /events/slug/{slug}/' => function ($slug) use ($eventController) {
        $eventController->getRecordBySlug($slug);
    },

    // ✅ Get total number of events
'GET /events/get/count/' => function () use ($eventController) {
    $eventController->getEventCount();
},

 'GET /events/get/booked-tickets-count/' => function () use ($eventController) {
    if (isset($_GET['eventId']) && isset($_GET['showtimeId']) && isset($_GET['ticketTypeId'])) {
        $eventController->getTicketAvailabilityByEventAndShowtime($_GET['eventId'], $_GET['showtimeId'], $_GET['ticketTypeId']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing eventId, showtimeId, or ticketTypeId']);
    }
 },


    // ✅ Get current featured banner event
    'GET /events/featured/' => function () use ($eventController) {
        $eventController->getFeaturedEvent();
    },

    // ✅ Put generic {id} route AFTER specific routes
    'GET /events/{id}/' => function ($id) use ($eventController) {
        $eventController->getRecordById($id);
    },

    'POST /events/' => function () use ($eventController) {
        $eventController->createRecord();
    },

    'POST /events/{id}/' => function ($id) use ($eventController) {
        $eventController->updateRecord($id);
    },

    'PUT /events/{id}/' => function ($id) use ($eventController) {
        $eventController->updateRecord($id);
    },

    // ✅ Quick toggle accept booking
    'POST /events/{id}/accept-booking/' => function ($id) use ($eventController) {
        $eventController->toggleAcceptBooking($id);
    },

    'PUT /events/{id}/accept-booking/' => function ($id) use ($eventController) {
        $eventController->toggleAcceptBooking($id);
    },

    // ✅ Set / unset featured banner event
    'POST /events/{id}/featured/' => function ($id) use ($eventController) {
        $eventController->setFeatured($id);
    },

    'PUT /events/{id}/featured/' => function ($id) use ($eventController) {
        $eventController->setFeatured($id);
    },

    'DELETE /events/{id}/' => function ($id) use ($eventController) {
        $eventController->deleteRecord($id);
    }
];