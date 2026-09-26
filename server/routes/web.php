<?php
// Set CORS headers for every response
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle OPTIONS requests (preflight)

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

ini_set('memory_limit', '256M');

// Report all PHP errors
error_reporting(E_ALL);

// Display errors in the browser (for development)
ini_set('display_errors', 1);

// Transactions Route files 
$BookedTicketRoutes = require './routes/ticket/BookedTicketRoutes.php';
$BookingRoutes = require './routes/ticket/BookingRoutes.php';
$EventRoutes = require './routes/ticket/EventRoutes.php';
$OrganizerRoutes = require './routes/ticket/OrganizerRoutes.php';  // BookingShowtimeRoutes
$UserRoutes = require './routes/ticket/UserRoutes.php';
$TicketTypeRoutes = require './routes/ticket/TicketTypeRoutes.php';
$ShowTimeRoutes = require './routes/ticket/ShowTimeRoutes.php';
$ShowTimeTicketAvailabilityRoutes = require './routes/ticket/ShowTimeTicketAvailabilityRoutes.php';
$CategoryRoutes = require './routes/ticket/CategoryRoutes.php';
$CategoryRoutes = require './routes/ticket/CategoryRoutes.php';
$BookingEventRoutes = require './routes/ticket/BookingEventRoutes.php';
$BookingShowtimeRoutes = require './routes/ticket/BookingShowtimeRoutes.php';
$PaymentRoutes = require './routes/ticket/PaymentRoutes.php';
$TicketVerificationRoutes = require './routes/ticket/TicketVerificationRoutes.php';
// Combine all routes
$routes = array_merge(
    $BookedTicketRoutes,
    $PaymentRoutes,
    $BookingRoutes,
    $EventRoutes,
    $OrganizerRoutes,
    $UserRoutes,
    $TicketTypeRoutes,
    $ShowTimeRoutes,
    $ShowTimeTicketAvailabilityRoutes,
    $CategoryRoutes,
    $BookingEventRoutes,
    $BookingShowtimeRoutes,
    $TicketVerificationRoutes
);

// Define the home route with trailing slash

$routes['GET /'] = function () {
    // Serve the index.html file
    readfile('./views/index.html');
};

// Get request method and URI
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);  // Get only the path, not query parameters

// Ensure URI always has a trailing slash
if (substr($uri, -1) !== '/') {
    // $uri .= '/';
}

// Automatically strip subdirectory path dynamically (supports subfolders and root domain)
$scriptDir = trim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
if (!empty($scriptDir)) {
    $uri = preg_replace('#^/' . preg_quote($scriptDir, '#') . '(?=/|$)#', '', $uri);
}
// Legacy alias fallback
$uri = str_replace('/gotickets-server.payshia.com', '', $uri);

if (empty($uri) || $uri[0] !== '/') {
    $uri = '/' . $uri;
}
// Set the header for JSON responses, except for HTML pages
if ($uri !== '/') {
    header('Content-Type: application/json');
}

// echo $uri;
// Debugging
error_log("Method: $method");
error_log("URI: $uri");
// echo $uri;
// Define a generic regex pattern for routes with placeholders like {id}, {username}, etc.

$routeRegexPattern = "#\{[a-zA-Z0-9_]+\}#"; // Matches anything inside {}
// Route matching

foreach ($routes as $route => $handler) {
    list($routeMethod, $routeUri) = explode(' ', $route, 2);
    // Replace all placeholders like {id}, {username}, etc. with a generic regex that matches alphanumeric strings
    $routeRegex = preg_replace($routeRegexPattern, '([a-zA-Z0-9_\-]+)', $routeUri);
    $routeRegex = "#^" . rtrim($routeRegex, '/') . "/?$#";
    error_log("Checking route: $routeRegex");
    // Check if the route matches the request
    if ($method === $routeMethod && preg_match($routeRegex, $uri, $matches)) {

        array_shift($matches); // Remove the full match
        error_log("Route matched: $route");

        // Call the route handler with dynamic parameters
        call_user_func_array($handler, $matches);
        exit;
    }
}

// Default 404 response
header("HTTP/1.1 404 Not Found");
echo json_encode(['error' => 'Route not found']);
