<?php
require_once './controllers/t/TicketTypeController.php';

$pdo = $GLOBALS['pdo'];
$ticketTypeController = new TicketTypeController($pdo);

return [

    // Get all ticket types or filter by event ID
    'GET /ticket-types/' => function () use ($ticketTypeController) {
        if (isset($_GET['eventid'])) {
            $ticketTypeController->getRecordsByEventId($_GET['eventid']);
        } else {
            $ticketTypeController->getAllRecords();
        }
    },

    // ✅ MOVED UP: Get availability - BEFORE the {id} route to avoid conflicts
    'GET /ticket-types/availability/' => function () use ($ticketTypeController) {
        // Debug what we're receiving
        error_log("GET params: " . print_r($_GET, true));

        if (isset($_GET['eventid']) && isset($_GET['showtimeid'])) {
            $ticketTypeController->getAvailability($_GET['eventid'], $_GET['showtimeid']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing eventid or showtimeid']);
        }
    },

    // ✅ NEW: Get ticket type IDs by Event ID
    'GET /ticket-types/ids/' => function () use ($ticketTypeController) {
        if (isset($_GET['eventid'])) {
            $ticketTypeController->getTicketTypeIdsByEventId($_GET['eventid']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing eventid']);
        }
    },

    // ✅ NEW: Get specific ticket type availability
    'GET /ticket-types/availability/{tickettypeid}/' => function ($ticketTypeId) use ($ticketTypeController) {
        if (isset($_GET['eventid']) && isset($_GET['showtimeid'])) {
            $ticketTypeController->getTicketTypeAvailability($_GET['eventid'], $_GET['showtimeid'], $ticketTypeId);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing eventid or showtimeid']);
        }
    },

    // Get single ticket type by ID - MOVED AFTER availability route
    'GET /ticket-types/{id}/' => function ($id) use ($ticketTypeController) {
        $ticketTypeController->getRecordById($id);
    },

    // Create ticket type
    'POST /ticket-types/' => function () use ($ticketTypeController) {
        $ticketTypeController->createRecord();
    },

    // ✅ NEW: Purchase Tickets - Reduce availability and return updated info
    'GET /ticket-types/update/purchase/' => function () use ($ticketTypeController) {
        if (isset($_GET['eventid']) && isset($_GET['showtimeid']) && isset($_GET['tickettypeid'])) {
            $ticketTypeController->purchaseTickets($_GET['eventid'], $_GET['showtimeid'], $_GET['tickettypeid']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing eventid, showtimeid, or tickettypeid']);
        }
    },

    // Update ticket type by ID
    'PUT /ticket-types/{id}/' => function ($id) use ($ticketTypeController) {
        $ticketTypeController->updateRecord($id);
    },

    // Delete ticket type by ID
    'DELETE /ticket-types/{id}/' => function ($id) use ($ticketTypeController) {
        $ticketTypeController->deleteRecord($id);
    },

    // Update availability only
    'PUT /ticket-types/update/availability/' => function () use ($ticketTypeController) {
        if (isset($_GET['eventid']) && isset($_GET['showtimeid'])) {
            $ticketTypeId = $_GET['tickettypeid'] ?? null;
            $ticketTypeController->updateAvailability($_GET['eventid'], $_GET['showtimeid'], $ticketTypeId);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing eventid or showtimeid']);
        }
    },

    // ✅ NEW: Update full ticket type data by eventId, showtimeId, and ticketTypeId
   'GET /ticket-types/update/purchase/' => function () use ($ticketTypeController) {
    if (isset($_GET['eventid']) && isset($_GET['showtimeid']) && isset($_GET['tickettypeid']) && isset($_GET['ticketCount'])) {
        $ticketTypeController->purchaseTickets($_GET['eventid'], $_GET['showtimeid'], $_GET['tickettypeid']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameters: eventid, showtimeid, tickettypeid, or ticketCount']);
    }
},

    // ✅ Delete ticket type by eventId and showtimeId
    'DELETE /ticket-types/' => function () use ($ticketTypeController) {
        if (isset($_GET['eventid']) && isset($_GET['showtimeid'])) {
            $ticketTypeController->deleteByEventAndShowtime($_GET['eventid'], $_GET['showtimeid']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing eventid or showtimeid']);
        }
    }

];
