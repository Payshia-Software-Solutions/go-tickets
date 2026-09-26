<?php
require_once './models/t/Event.php';

class EventController
{
    private $model;
    private $ftpConfig;

    public function __construct($pdo)
    {
        $this->model = new Event($pdo);
        $this->ftpConfig = include('./config/ftp.php');
    }

    // FTP Helper Methods (copied from ConvocationRegistrationController)
    private function ensureDirectoryExists($ftp_conn, $dir)
    {
        $parts = explode('/', $dir);
        $path = '';
        foreach ($parts as $part) {
            if (empty($part)) {
                continue;
            }
            $path .= '/' . $part;
            if (!@ftp_chdir($ftp_conn, $path)) {
                if (!ftp_mkdir($ftp_conn, $path)) {
                    throw new Exception("Could not create directory: $path on FTP server.");
                }
            }
        }
    }

    private function uploadToFTP($localFile, $ftpFilePath)
    {
        ini_set('memory_limit', '256M'); // Increase memory limit for image processing
        
        // FTP credentials from config
        $ftp_server   = $this->ftpConfig['ftp_server'];
        $ftp_username = $this->ftpConfig['ftp_username'];
        $ftp_password = $this->ftpConfig['ftp_password'];

        // Connect to FTP server
        $ftp_conn = ftp_connect($ftp_server);
        if (!$ftp_conn) {
            error_log("FTP connection failed: $ftp_server");
            return false;
        }

        // Login to FTP
        if (!ftp_login($ftp_conn, $ftp_username, $ftp_password)) {
            ftp_close($ftp_conn);
            error_log("FTP login failed for user: $ftp_username");
            return false;
        }

        // Enable passive mode
        ftp_pasv($ftp_conn, true);

        // Ensure that the target directory exists
        try {
            $this->ensureDirectoryExists($ftp_conn, dirname($ftpFilePath));
        } catch (Exception $e) {
            error_log("Directory creation failed: " . $e->getMessage());
            ftp_close($ftp_conn);
            return false;
        }

        // Upload file
        if (!ftp_put($ftp_conn, $ftpFilePath, $localFile, FTP_BINARY)) {
            ftp_close($ftp_conn);
            error_log("Failed to upload: $localFile to $ftpFilePath");
            return false;
        }

        // Close FTP connection
        ftp_close($ftp_conn);
        return true;
    }

    // Validate image file
    private function validateImage($file)
    {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $maxSize = 5 * 1024 * 1024; // 5MB

        if (!in_array($file['type'], $allowedTypes)) {
            return 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.';
        }

        if ($file['size'] > $maxSize) {
            return 'File size too large. Maximum 5MB allowed.';
        }

        return null; // No errors
    }

    // Create directory-safe event name
    private function sanitizeEventName($eventName)
    {
        // Remove special characters and spaces, replace with hyphens
        $sanitized = preg_replace('/[^a-zA-Z0-9\s-]/', '', $eventName);
        $sanitized = preg_replace('/\s+/', '-', trim($sanitized));
        $sanitized = strtolower($sanitized);
        return $sanitized;
    }

    public function getAllRecords()
    {
        $records = $this->model->getAllEvents();
        echo json_encode($records);
    }

    public function getRecordById($id)
    {
        $record = $this->model->getEventById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found']);
        }
    }

    public function getRecordBySlug($slug)
    {
        $record = $this->model->getEventBySlug($slug);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found']);
        }
    }

    public function createRecord()
    {
        // Check if the request is multipart/form-data (with file upload)
        if ($_SERVER['CONTENT_TYPE'] && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
            $data = $_POST; // Form fields
            $file = $_FILES['image'] ?? null; // Uploaded image file

            // Validate required fields
            if (
                !isset($data['name']) || !isset($data['date']) || 
                !isset($data['location']) || !isset($data['category']) ||
                !isset($data['venueName']) || !isset($data['organizerId'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields: name, date, location, category, venueName, organizerId']);
                return;
            }

            // First create the event to get the ID
            $newId = $this->model->createEvent([
                'name' => $data['name'],
                'date' => $data['date'],
                'location' => $data['location'],
                'description' => $data['description'] ?? null,
                'category' => $data['category'],
                'imageUrl' => "no_image.png", // Will be updated after image upload
                'venueName' => $data['venueName'],
                'venueAddress' => $data['venueAddress'] ?? null,
                'organizerId' => $data['organizerId']
            ]);

            // Handle image upload if provided
            $imageUrl = $data['imageUrl'] ?? null; // Default/fallback image URL
            
            if (!empty($file) && $file['error'] === UPLOAD_ERR_OK) {
                // Validate image
                $validationError = $this->validateImage($file);
                if ($validationError) {
                    http_response_code(400);
                    echo json_encode(['error' => $validationError]);
                    return;
                }

                $fileTmpPath = $file['tmp_name'];
                
                // Create directory structure based on event ID
                $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $originalFileName = pathinfo($file['name'], PATHINFO_FILENAME);
                $sanitizedFileName = preg_replace('/[^a-zA-Z0-9\-_]/', '', $originalFileName);
                $fileName = $sanitizedFileName . '-' . uniqid() . '.' . $fileExtension;
                
                $localUploadPath = './uploads/' . $fileName;
                $ftpFilePath = "/event-images/" . $newId . "/" . $fileName; // Path: event-images/eventid/imagename

                // Ensure the local upload directory exists
                if (!is_dir('./uploads/')) {
                    mkdir('./uploads/', 0777, true);
                }

                // Move the file locally first
                if (!move_uploaded_file($fileTmpPath, $localUploadPath)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'File upload failed']);
                    return;
                }

                // Upload to FTP server
                if ($this->uploadToFTP($localUploadPath, $ftpFilePath)) {
                    $imageUrl = $ftpFilePath; // Use FTP path as image URL
                    unlink($localUploadPath); // Remove local file after successful FTP upload
                    
                    // Update the event with the image URL
                    $this->model->updateEvent($newId, [
                        'name' => $data['name'],
                        'date' => $data['date'],
                        'location' => $data['location'],
                        'description' => $data['description'] ?? null,
                        'category' => $data['category'],
                        'imageUrl' => $imageUrl,
                        'venueName' => $data['venueName'],
                        'venueAddress' => $data['venueAddress'] ?? null,
                        'organizerId' => $data['organizerId']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'FTP upload failed']);
                    return;
                }
            }

            http_response_code(201);
            echo json_encode([
                'message' => 'Event created successfully',
                'newEventId' => $newId,
                'imageUrl' => $imageUrl
            ]);

        } else {
            // Fallback for JSON (if no file is sent)
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (
                $data && isset($data['name']) &&
                isset($data['date']) && isset($data['location']) && isset($data['category']) &&
                isset($data['imageUrl']) && isset($data['venueName']) && isset($data['organizerId'])
            ) {
                $newId = $this->model->createEvent([
                    'name' => $data['name'],
                    'date' => $data['date'],
                    'location' => $data['location'],
                    'description' => $data['description'] ?? null,
                    'category' => $data['category'],
                    'imageUrl' => $data['imageUrl'],
                    'venueName' => $data['venueName'],
                    'venueAddress' => $data['venueAddress'] ?? null,
                    'organizerId' => $data['organizerId']
                ]);

                http_response_code(201);
                echo json_encode([
                    'message' => 'Event created successfully',
                    'newEventId' => $newId
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid input']);
            }
        }
    }

    public function updateRecord($id)
    {
        // Check if the request is multipart/form-data (with file upload)
        if ($_SERVER['CONTENT_TYPE'] && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
            $data = $_POST; // Form fields
            $file = $_FILES['image'] ?? null; // Uploaded image file

            // Validate required fields
            if (
                !isset($data['name']) || !isset($data['date']) || 
                !isset($data['location']) || !isset($data['category']) ||
                !isset($data['venueName']) || !isset($data['organizerId'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields: name, date, location, category, venueName, organizerId']);
                return;
            }

            // Get current event data to preserve existing image URL if no new image
            $currentEvent = $this->model->getEventById($id);
            $imageUrl = $currentEvent['imageUrl'] ?? null; // Keep existing image URL

            // Handle image upload if provided
            if (!empty($file) && $file['error'] === UPLOAD_ERR_OK) {
                // Validate image
                $validationError = $this->validateImage($file);
                if ($validationError) {
                    http_response_code(400);
                    echo json_encode(['error' => $validationError]);
                    return;
                }

                $fileTmpPath = $file['tmp_name'];
                
                $fileTmpPath = $file['tmp_name'];
                
                // Create directory structure based on event name
                $sanitizedEventName = $this->sanitizeEventName($data['name']);
                $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $fileName = $sanitizedEventName . '-' . uniqid() . '.' . $fileExtension;
                
                $localUploadPath = './uploads/' . $fileName;
                $ftpFilePath = "/event-images/" . $sanitizedEventName . "/" . $fileName; // Path: event-images/eventname/eventimage

                // Ensure the local upload directory exists
                if (!is_dir('./uploads/')) {
                    mkdir('./uploads/', 0777, true);
                }

                // Move the file locally first
                if (!move_uploaded_file($fileTmpPath, $localUploadPath)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'File upload failed']);
                    return;
                }

                // Upload to FTP server
                if ($this->uploadToFTP($localUploadPath, $ftpFilePath)) {
                    $imageUrl = $ftpFilePath; // Use new FTP path as image URL
                    unlink($localUploadPath); // Remove local file after successful FTP upload
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'FTP upload failed']);
                    return;
                }
            }

            // Update event in the database
            $this->model->updateEvent($id, [
                'name' => $data['name'],
                'date' => $data['date'],
                'location' => $data['location'],
                'description' => $data['description'] ?? null,
                'category' => $data['category'],
                'imageUrl' => $imageUrl,
                'venueName' => $data['venueName'],
                'venueAddress' => $data['venueAddress'] ?? null,
                'organizerId' => $data['organizerId']
            ]);

            echo json_encode([
                'message' => 'Event updated successfully',
                'imageUrl' => $imageUrl
            ]);

        } else {
            // Fallback for JSON (if no file is sent)
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (
                $data && isset($data['name']) &&
                isset($data['date']) && isset($data['location']) && isset($data['category']) &&
                isset($data['imageUrl']) && isset($data['venueName']) && isset($data['organizerId'])
            ) {
                $this->model->updateEvent($id, [
                    'name' => $data['name'],
                    'date' => $data['date'],
                    'location' => $data['location'],
                    'description' => $data['description'] ?? null,
                    'category' => $data['category'],
                    'imageUrl' => $data['imageUrl'],
                    'venueName' => $data['venueName'],
                    'venueAddress' => $data['venueAddress'] ?? null,
                    'organizerId' => $data['organizerId']
                ]);
                echo json_encode(['message' => 'Event updated successfully']);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid input']);
            }
        }
    }

    public function deleteRecord($id)
    {
        $this->model->deleteEvent($id);
        echo json_encode(['message' => 'Event deleted successfully']);
    }

    public function filterEvents()
    {
        try {
            $filters = [];
            
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                if ($data) {
                    $filters = $data;
                }
            } else {
                if (isset($_GET['location']) && !empty($_GET['location'])) {
                    $filters['location'] = $_GET['location'];
                }
                if (isset($_GET['category']) && !empty($_GET['category'])) {
                    $filters['category'] = $_GET['category'];
                }
                if (isset($_GET['date']) && !empty($_GET['date'])) {
                    $filters['date'] = $_GET['date'];
                }
            }

            $events = $this->model->filterEvents($filters);
            
            echo json_encode([
                'success' => true,
                'data' => $events,
                'count' => count($events),
                'filters_applied' => $filters
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    public function searchByName()
    {
        try {
            $searchTerm = '';
            
            if (isset($_GET['q']) && !empty($_GET['q'])) {
                $searchTerm = $_GET['q'];
            } elseif (isset($_GET['name']) && !empty($_GET['name'])) {
                $searchTerm = $_GET['name'];
            }
            
            if (empty($searchTerm)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Search term is required. Use ?q=searchterm or ?name=searchterm'
                ]);
                return;
            }
            
            $events = $this->model->searchEventsByName($searchTerm);
            
            echo json_encode([
                'success' => true,
                'data' => $events,
                'count' => count($events),
                'search_term' => $searchTerm,
                'search_type' => 'name_only'
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    public function searchEvents()
    {
        try {
            $searchTerm = '';
            
            if (isset($_GET['q']) && !empty($_GET['q'])) {
                $searchTerm = $_GET['q'];
            }
            
            if (empty($searchTerm)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Search term is required. Use ?q=searchterm'
                ]);
                return;
            }
            
            $events = $this->model->searchEvents($searchTerm);
            
            echo json_encode([
                'success' => true,
                'data' => $events,
                'count' => count($events),
                'search_term' => $searchTerm,
                'search_type' => 'comprehensive'
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    public function getEventCount()
    {
        try {
            $count = $this->model->getEventCount();
            echo json_encode([
                'success' => true,
                'totalEvents' => $count
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }


   public function getTicketAvailabilityByEventAndShowtime($eventId, $showtimeId, $ticketTypeId)
{
    try {
        // Optional validation
        if (!$eventId || !$showtimeId || !$ticketTypeId) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid parameters']);
            return;
        }

        $bookedCount = $this->model->getBookedTicketsCount($eventId, $showtimeId, $ticketTypeId);
        $releaseCount = $this->model->releasedTicketsCount($eventId, $showtimeId, $ticketTypeId);

        $availableCount = $releaseCount - $bookedCount;

        http_response_code(200);
        echo json_encode([
            'available' => $availableCount,
            'booked' => $bookedCount,
            'released' => $releaseCount
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    }
}

public function getEventByIdRaw($id)
{
    return $this->model->getEventById($id);
}

}