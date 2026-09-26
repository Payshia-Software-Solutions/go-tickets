<?php
require_once dirname(__DIR__, 2) . '/config/env.php';
require_once './models/t/Booking.php';
require_once './controllers/t/BookingEventController.php';
require_once './controllers/t/BookingShowtimeController.php'; // PaymentController
require_once './models/t/User.php';
require_once './controllers/t/PaymentController.php';
require_once './controllers/t/EventController.php';

date_default_timezone_set('Asia/Colombo');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require './vendor/autoload.php';

class BookingController
{
    private $model;
    public $pdo;
    public $bookingEventController;
    public $bookingShowtimeController;
    private $userModel;
    private $paymentController;
    private $EventController;
    private $ftpConfig;

    // PayHere configuration from environment
    private $merchant_id;
    private $merchant_secret;
    private $domainName;
    private $serverUrl;
    private $modePrefix;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->model = new Booking($pdo);
        $this->userModel = new User($pdo);


        // ✅ Inject sub-controllers
        $this->bookingEventController = new BookingEventController($pdo);
        $this->bookingShowtimeController = new BookingShowtimeController($pdo);
        $this->paymentController = new PaymentController($pdo);
        $this->EventController = new EventController($pdo);
        $this->ftpConfig = include('./config/ftp.php');

        $this->merchant_id = env('PAYHERE_MERCHANT_ID', '');
        $this->merchant_secret = env('PAYHERE_MERCHANT_SECRET', '');
        $this->domainName = rtrim(env('PAYHERE_DOMAIN_NAME', 'https://gotickets.silverray.lk'), '/');
        $this->serverUrl = rtrim(env('PAYHERE_SERVER_URL', 'https://gotickets-server.payshia.com'), '/');
        $this->modePrefix = env('PAYHERE_MODE', 'www');
    }

    // FTP Helper Methods for remote slip and media upload
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
                if (!@ftp_mkdir($ftp_conn, $path)) {
                    throw new Exception("Could not create directory: $path on FTP server.");
                }
            }
        }
    }

    private function uploadToFTP($localFile, $ftpFilePath)
    {
        ini_set('memory_limit', '256M');

        $ftp_server   = $this->ftpConfig['ftp_server'];
        $ftp_username = $this->ftpConfig['ftp_username'];
        $ftp_password = $this->ftpConfig['ftp_password'];
        $ftp_port     = $this->ftpConfig['ftp_port'] ?? 21;

        $ftp_conn = @ftp_connect($ftp_server, $ftp_port, 25);
        if (!$ftp_conn) {
            error_log("FTP connection failed: $ftp_server on port $ftp_port");
            return false;
        }

        if (!@ftp_login($ftp_conn, $ftp_username, $ftp_password)) {
            @ftp_close($ftp_conn);
            error_log("FTP login failed for user: $ftp_username");
            return false;
        }

        ftp_pasv($ftp_conn, true);

        try {
            $this->ensureDirectoryExists($ftp_conn, dirname($ftpFilePath));
        } catch (Exception $e) {
            error_log("Directory creation failed on FTP: " . $e->getMessage());
            @ftp_close($ftp_conn);
            return false;
        }

        if (!@ftp_put($ftp_conn, $ftpFilePath, $localFile, FTP_BINARY)) {
            @ftp_close($ftp_conn);
            error_log("Failed to upload: $localFile to $ftpFilePath on FTP");
            return false;
        }

        @ftp_close($ftp_conn);
        return true;
    }

    /**
     * Enhanced method to get booking events with event names
     */
    private function getBookingEventsWithEventNames($bookingId)
    {
        // Get booking_event records for this booking
        $bookingEvents = $this->bookingEventController->getByBookingIdRaw($bookingId);

        // For each booking_event, get event details and associated booking_showtime records
        foreach ($bookingEvents as &$event) {
            // Get event details using EventController
            $eventDetails = $this->EventController->getEventByIdRaw($event['eventId']);

            // Add event name to the booking_event record
            if ($eventDetails) {
                $event['event_name'] = $eventDetails['name'] ?? 'Unknown Event';
            } else {
                $event['event_name'] = 'Event Not Found';
            }

            // Get associated booking_showtime records
            $showtimes = $this->bookingShowtimeController->getByBookingAndEventRaw(
                $bookingId,
                $event['eventId']
            );
            $event['booking_showtime'] = $showtimes;
        }

        return $bookingEvents;
    }

    // ✅ Get all bookings
    public function getAllRecords()
    {
        $records = $this->model->getAllBookings();
        echo json_encode($records);
    }

    // ✅ Get booking by ID
    public function getRecordById($id)
    {
        $record = $this->model->getBookingById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found']);
        }
    }

    // ✅ Get bookings by user ID
    public function getRecordsByUserId($userId)
    {
        $records = $this->model->getBookingsByUserId($userId);
        if ($records) {
            echo json_encode($records);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'No bookings found for this user']);
        }
    }

    // ✅ Get booking by QR code
    public function getRecordByQrCode($qrCode)
    {
        $record = $this->model->getBookingByQrCode($qrCode);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found for QR Code']);
        }
    }

    // ✅ Enhanced Create booking with billing address management
    public function createRecord()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset(
                $data['userId'],
                $data['totalPrice'],
                $data['eventName'],
                $data['eventDate'],
                $data['eventLocation'],
                $data['qrCodeValue']
            )
        ) {
            // ✅ Check if this is a guest booking
            $isGuest = isset($data['guest']) && $data['guest'] == 1;

            // ✅ Validate userId and get current user data (only if not a guest)
            $currentUser = null;
            if (!$isGuest) {
                $currentUser = $this->userModel->getUserById($data['userId']);
                if (!$currentUser) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid userId']);
                    return;
                }
            }

            // ✅ Handle billing address update ONLY if NOT a guest
            $billingUpdated = false;
            if (!$isGuest && $currentUser) {
                $billingFields = [
                    'billing_street',
                    'billing_city',
                    'billing_state',
                    'billing_postal_code',
                    'billing_country'
                ];

                $billingDataProvided = false;
                $billingData = [];

                foreach ($billingFields as $field) {
                    if (isset($data[$field]) && !empty($data[$field])) {
                        $billingDataProvided = true;
                        $billingData[$field] = $data[$field];
                    }
                }

                // ✅ Update user billing address if new billing data is provided and different
                if ($billingDataProvided) {
                    $needsUpdate = false;
                    foreach ($billingData as $field => $value) {
                        if ($currentUser[$field] !== $value) {
                            $needsUpdate = true;
                            break;
                        }
                    }

                    if ($needsUpdate) {
                        // Prepare update data with current user data as base
                        $updateData = [
                            'email' => $currentUser['email'],
                            'password' => $currentUser['password'],
                            'name' => $currentUser['name'],
                            'isAdmin' => $currentUser['isAdmin'],
                            'billing_street' => $billingData['billing_street'] ?? $currentUser['billing_street'],
                            'billing_city' => $billingData['billing_city'] ?? $currentUser['billing_city'],
                            'billing_state' => $billingData['billing_state'] ?? $currentUser['billing_state'],
                            'billing_postal_code' => $billingData['billing_postal_code'] ?? $currentUser['billing_postal_code'],
                            'billing_country' => $billingData['billing_country'] ?? $currentUser['billing_country']
                        ];

                        $this->userModel->updateUser($data['userId'], $updateData);
                        $billingUpdated = true;

                        // Get updated user data
                        $currentUser = $this->userModel->getUserById($data['userId']);
                    }
                }
            }

            // ✅ Prepare booking data for model
            $methodNorm = strtolower(str_replace([' ', '_', '-'], '', $data['payment_method'] ?? ''));
            $isPayHere = in_array($methodNorm, ['onlinepayhere', 'payhere', '']);
            $isManual = (isset($data['booked_type']) && $data['booked_type'] === 'manualy') || (isset($data['payment_method']) && !$isPayHere);
            $isComplimentary = isset($data['payment_method']) && strtolower(trim($data['payment_method'])) === 'complimentary';

            if ($isComplimentary) {
                $amountPaid = 0.00;
                $balanceAmount = 0.00;
                $paymentStatus = 'Paid';
            } else {
                $amountPaid = isset($data['amount_paid']) ? floatval($data['amount_paid']) : ($isManual && ($data['payment_status'] ?? '') === 'paid' ? floatval($data['totalPrice']) : 0.00);
                $balanceAmount = isset($data['balance_amount']) ? floatval($data['balance_amount']) : max(0.00, floatval($data['totalPrice']) - $amountPaid);
                $paymentStatus = $data['payment_status'] ?? ($amountPaid >= floatval($data['totalPrice']) ? 'Paid' : ($amountPaid > 0 ? 'Partially Paid' : 'pending'));
            }

            $bookingData = [
                'userId' => $data['userId'],
                'first_name' => $data['first_name'] ?? '',
                'last_name' => $data['last_name'] ?? '',
                'nic' => $data['nic'] ?? '',
                'contact_number' => $data['contact_number'] ?? '',
                'email' => $data['email'] ?? '',
                'guest' => $data['guest'] ?? 0,
                'booked_type' => $data['booked_type'] ?? ($isManual ? 'manualy' : 'online'),
                'totalPrice' => $data['totalPrice'],
                'amount_paid' => $amountPaid,
                'balance_amount' => $balanceAmount,
                'payment_method' => $data['payment_method'] ?? ($isManual ? 'bank_transfer' : 'online_payhere'),
                'payment_slip' => $data['payment_slip'] ?? null,
                'payment_notes' => $data['payment_notes'] ?? null,
                'eventName' => $data['eventName'],
                'eventDate' => $data['eventDate'],
                'eventLocation' => $data['eventLocation'],
                'qrCodeValue' => $data['qrCodeValue'],
                'payment_status' => $paymentStatus
            ];

            // ✅ Create booking
            $bookingId = $this->model->createBooking($bookingData);

            if (!$bookingId) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create booking']);
                return;
            }

            // If an initial payment amount was recorded, record it in booking_payments ledger too
            if ($amountPaid > 0) {
                $this->model->addPaymentRecord($bookingId, [
                    'amount' => $amountPaid,
                    'payment_method' => $data['payment_method'] ?? 'bank_transfer',
                    'payment_slip' => $data['payment_slip'] ?? null,
                    'reference' => $data['payment_reference'] ?? 'Initial Payment',
                    'notes' => $data['payment_notes'] ?? 'Initial deposit recorded upon booking creation'
                ]);
            }

            // ✅ Create booking_event entries
            if (!empty($data['booking_event']) && is_array($data['booking_event'])) {
                foreach ($data['booking_event'] as $eventData) {
                    $eventData['booking_id'] = $bookingId;
                    $this->bookingEventController->createFromParent($eventData);
                }
            }

            // ✅ Create booking_showtime entries
            if (!empty($data['booking_showtime']) && is_array($data['booking_showtime'])) {
                foreach ($data['booking_showtime'] as $showtimeData) {
                    $showtimeData['booking_id'] = $bookingId;
                    $this->bookingShowtimeController->createFromParent($showtimeData);
                }
            }

            // ✅ Get the created booking
            $created = $this->model->getBookingById($bookingId);

            if (!$created) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to retrieve created booking']);
                return;
            }

            // For manual bookings, do not invoke PayHere HTML form; return JSON success response directly
            if ($isManual) {
                http_response_code(201);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => true,
                    'message' => 'Manual booking created successfully',
                    'booking_id' => $bookingId,
                    'booking' => $created
                ]);
                return;
            }

            // ✅ Initiate payment (for online checkouts)
            $totalvalue = $data['totalPrice'];
            http_response_code(200);
            header('Content-Type: text/html; charset=utf-8');
            $paymentform = $this->paymentController->initiatePayment(
                $bookingId,
                $totalvalue,
                $created
            );

            echo $paymentform;
            return;

            // Alternative: Return JSON response (uncomment if needed)
            /*
        echo json_encode([
            'message' => 'Booking created successfully',
            'booking_id' => $bookingId,
            'is_guest' => $isGuest,
            'billing_updated' => $billingUpdated,
            'booking' => $created
        ]);
        */
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input. Required fields: userId, totalPrice, eventName, eventDate, eventLocation, qrCodeValue']);
        }
    }

    // ✅ Get booking by ID with nested relations and user billing info
    public function getRecordByIdWithRelations($id)
    {
        // Get the main booking record
        $booking = $this->model->getBookingById($id);

        if (!$booking) {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found']);
            return;
        }

        // Get user billing information
        $user = $this->userModel->getUserById($booking['userId']);
        if ($user) {
            unset($user['password']);
            $booking['user_billing_info'] = [
                'name' => $user['name'],
                'email' => $user['email'],
                'billing_street' => $user['billing_street'],
                'billing_city' => $user['billing_city'],
                'billing_state' => $user['billing_state'],
                'billing_postal_code' => $user['billing_postal_code'],
                'billing_country' => $user['billing_country']
            ];
        }

        // ✅ MODIFIED: Use the new method to get booking events with event names
        $bookingEvents = $this->getBookingEventsWithEventNames($id);

        // Add the nested booking_event array to the main booking
        $booking['booking_event'] = $bookingEvents;

        echo json_encode([
            'success' => true,
            'booking' => $booking
        ]);
    }

    public function getRecordByIdWithRelationsArray($id)
    {
        // Get the main booking record
        $booking = $this->model->getBookingById($id);

        if (!$booking) {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found']);
            return;
        }

        // Get user billing information
        $user = $this->userModel->getUserById($booking['userId']);
        if ($user) {
            unset($user['password']);
            $booking['user_billing_info'] = [
                'name' => $user['name'],
                'email' => $user['email'],
                'billing_street' => $user['billing_street'],
                'billing_city' => $user['billing_city'],
                'billing_state' => $user['billing_state'],
                'billing_postal_code' => $user['billing_postal_code'],
                'billing_country' => $user['billing_country']
            ];
        }

        // ✅ MODIFIED: Use the new method to get booking events with event names
        $bookingEvents = $this->getBookingEventsWithEventNames($id);

        // Add the nested booking_event array to the main booking
        $booking['booking_event'] = $bookingEvents;

        return $booking;
    }


    public function paymentNotify()
    {
        $logFile = 'logs/payment_notify_log.txt';

        // Step 1: Retrieve the incoming payment notification data (x-www-form-urlencoded)
        $data = $_POST;

        // Debug: Log raw incoming data
        file_put_contents($logFile, "Incoming Data: " . json_encode($data) . PHP_EOL, FILE_APPEND);

        // Step 2: Validate required fields
        if (!isset($data['merchant_id'], $data['order_id'], $data['payhere_amount'], $data['payhere_currency'], $data['status_code'], $data['md5sig'])) {
            $message = ['error' => 'Missing required fields'];
            file_put_contents($logFile, "Validation Failed: " . json_encode($message) . PHP_EOL, FILE_APPEND);
            http_response_code(400);
            echo json_encode($message);
            return;
        }

        // Step 3: Assign fields
        $merchant_id = $data['merchant_id'];
        $order_id = $data['order_id'];
        $payhere_amount = $data['payhere_amount'];
        $payhere_currency = $data['payhere_currency'];
        $status_code = $data['status_code'];
        $md5sig = $data['md5sig'];

        // Step 4: Recreate MD5 signature
        $local_md5sig = strtoupper(
            md5(
                $merchant_id .
                    $order_id .
                    $payhere_amount .
                    $payhere_currency .
                    $status_code .
                    strtoupper(md5($this->merchant_secret))
            )
        );

        // Step 5: Verify signature and payment status
        if ($local_md5sig === $md5sig && $status_code == 2) {
            try {
                $bookingId = $order_id;
                $paymentStatus = "Paid";
                $paymentStatusUpdated = $this->updatePaymentStatus($bookingId, $paymentStatus);

                $paymentData = [
                    'rec_number' => uniqid('rec-'),
                    'payment_type' => 'IPG',
                    'payment_amount' => $payhere_amount,
                    'payment_status' => 'Paid',
                    'created_by' => 'System',
                    'reference_id' => $order_id
                ];

                $bookingInfo = $this->getRecordByIdWithRelationsArray($bookingId);

                $bookingData = [
                    'booking_id' => $bookingId,
                    'event_name' => $bookingInfo['eventName'],
                    'event_date' => $bookingInfo['eventDate'], // MySQL datetime format
                    'event_location' => $bookingInfo['eventLocation'],
                    'booking_date' => $bookingInfo['bookingDate'], // When booking was made
                    'customer_name' => $bookingInfo['user_billing_info']['name'],
                    'customer_email' => $bookingInfo['email'],
                    'view_ticket_url' => 'https://gotickets.silverray.lk/booking-confirmation?order_id=' . $bookingId,
                    'view_bookings_url' => 'https://gotickets.silverray.lk/booking-confirmation?order_id=' . $bookingId,
                    'home_url' => 'https://gotickets.silverray.lk'
                ];

                $customerEmail = $bookingInfo['email'];

                $this->paymentController->createRecord($paymentData);
                $emailStatus = $this->sendOrderConfirmationEmail($bookingData, $customerEmail);

                $message = ['success' => 'Payment verified and recorded', 'email' => $emailStatus];
                file_put_contents($logFile, "Success: " . json_encode($message) . PHP_EOL, FILE_APPEND);
                echo json_encode($message);
            } catch (Exception $e) {
                $error = ['error' => 'Internal server error during database operation'];
                file_put_contents($logFile, "Exception: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
                http_response_code(500);
                echo json_encode($error);
            }
        } else {
            $error = ['error' => 'Invalid payment notification or payment failed'];
            file_put_contents($logFile, "Validation Failed: " . json_encode($error) . PHP_EOL, FILE_APPEND);
            http_response_code(400);
            echo json_encode($error);
        }
    }

    public function continuePayment($bookingId)
    {
        $bookingInfo = $this->model->getBookingById($bookingId);
        $totalvalue = $bookingInfo['totalPrice'];

        $paymentform = $this->paymentController->initiatePayment(
            $bookingId,
            $totalvalue,
            $bookingInfo
        );

        http_response_code(201);
        echo $paymentform;
    }

    public function updatePaymentStatus($bookingId, $paymentStatus = null)
    {
        // If paymentStatus is not passed directly, try getting it from the request body
        if ($paymentStatus === null) {
            $data = json_decode(file_get_contents("php://input"), true);
            if (!isset($data['payment_status'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing 'payment_status' parameter."]);
                return;
            }
            $paymentStatus = $data['payment_status'];
        }

        try {
            $this->model->updatePaymentStatus($bookingId, $paymentStatus);
            echo json_encode([
                "message" => "Payment status updated successfully",
                "booking_id" => $bookingId,
                "payment_status" => $paymentStatus
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "error" => "Failed to update payment status",
                "details" => $e->getMessage()
            ]);
        }
    }

    public function SendOderTest()
    {
        $bookingId = 1;
        $bookingInfo = $this->getRecordByIdWithRelationsArray($bookingId);

        $bookingData = [
            'booking_id' => $bookingId,
            'event_name' => $bookingInfo['eventName'],
            'event_date' => $bookingInfo['eventDate'], // MySQL datetime format
            'event_location' => $bookingInfo['eventLocation'],
            'booking_date' => $bookingInfo['bookingDate'], // When booking was made
            'customer_name' => $bookingInfo['user_billing_info']['name'],
            'customer_email' => $bookingInfo['email'],
            'view_ticket_url' => 'https://gotickets.lk/booking-confirmation?order_id=' . $bookingId,
            'view_bookings_url' => 'https://gotickets.lk/booking-confirmation?order_id=' . $bookingId,
            'home_url' => 'https://gotickets.lk'
        ];

        $customerEmail = $bookingInfo['email'];

        $emailResult = $this->sendOrderConfirmationEmail($bookingData, $customerEmail);

        // Output the result as JSON
        echo json_encode([
            'status' => $emailResult['status'],
            'message' => $emailResult['message']
        ]);
    }



    // ✅ Update booking
    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
            $data &&
            isset(
                $data['userId'],
                $data['totalPrice'],
                $data['eventName'],
                $data['eventDate'],
                $data['eventLocation'],
                $data['qrCodeValue'],
                $data['payment_status']
            )
        ) {
            // Validate userId
            $userStmt = $this->pdo->prepare("SELECT id FROM user WHERE id = ?");
            $userStmt->execute([$data['userId']]);
            if (!$userStmt->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid userId']);
                return;
            }

            $this->model->updateBooking($id, $data);
            echo json_encode(['message' => 'Booking updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // ✅ Delete booking
    public function deleteRecord($id)
    {
        $this->model->deleteBooking($id);
        echo json_encode(['message' => 'Booking deleted successfully']);
    }

    // ✅ Get total booking count
    public function getBookingCount()
    {
        try {
            $count = $this->model->getBookingCount();
            echo json_encode([
                'success' => true,
                'totalBookings' => $count
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    public function generateBookingEmailHTML($bookingData)
    {
        // Load the email template
        $templateFile = './templates/booking_confirmation_template.html';
        if (!file_exists($templateFile)) {
            throw new Exception("Email template file not found: {$templateFile}");
        }

        $emailTemplate = file_get_contents($templateFile);

        // Format the event date and time
        $eventDateTime = date('l, F j, Y \a\t g:i A', strtotime($bookingData['event_date']));
        $eventDateOnly = date('n/j/Y', strtotime($bookingData['event_date']));
        $bookingTimestamp = date('F j, Y \a\t g:i A', strtotime($bookingData['booking_date']));

        // Replace placeholders with booking data
        $placeholders = [
            '{{EVENT_NAME}}' => $bookingData['event_name'],
            '{{EVENT_DATE}}' => $eventDateOnly,
            '{{EVENT_DATE_TIME}}' => $eventDateTime,
            '{{EVENT_LOCATION}}' => $bookingData['event_location'],
            '{{BOOKING_ID}}' => $bookingData['booking_id'],
            '{{VIEW_TICKET_URL}}' => $bookingData['view_ticket_url'],
            '{{VIEW_BOOKINGS_URL}}' => $bookingData['view_bookings_url'],
            '{{HOME_URL}}' => $bookingData['home_url'],
            '{{CUSTOMER_NAME}}' => isset($bookingData['customer_name']) ? $bookingData['customer_name'] : '',
            '{{CUSTOMER_EMAIL}}' => isset($bookingData['customer_email']) ? $bookingData['customer_email'] : '',
        ];

        // Replace all placeholders
        foreach ($placeholders as $placeholder => $value) {
            $emailTemplate = str_replace($placeholder, $value, $emailTemplate);
        }

        return $emailTemplate;
    }

    public function sendOrderConfirmationEmail($orderData, $customerEmail)
    {
        $mail = new PHPMailer(true);

        try {
            // Server settings from environment
            $mail->isSMTP();
            $mail->Host = env('SMTP_HOST', 'mail.gotickets.lk');
            $mail->SMTPAuth = true;
            $mail->Username = env('SMTP_USERNAME', 'no-reply@gotickets.lk');
            $mail->Password = env('SMTP_PASSWORD', 'B3aalFq%rPgezPE7');
            
            $smtpPort = (int)env('SMTP_PORT', 465);
            $mail->Port = $smtpPort;
            if ($smtpPort === 465) {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } else if ($smtpPort === 587) {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }

            // Sender and primary recipient
            $fromEmail = env('SMTP_FROM_EMAIL', 'no-reply@gotickets.lk');
            $fromName  = env('SMTP_FROM_NAME', 'GoTickets.lk | Discover Your Next Event');
            $mail->setFrom($fromEmail, $fromName);
            $mail->addAddress($customerEmail);

            // Optional CC emails from environment (comma-separated)
            $ccList = env('SMTP_CC_EMAILS', 'reservation@silverray.lk,chalanik@silverray.lk,sanjayad@silverray.lk,shanilka@silverray.lk');
            if (!empty($ccList)) {
                $ccEmails = array_map('trim', explode(',', $ccList));
                foreach ($ccEmails as $cc) {
                    if (!empty($cc) && filter_var($cc, FILTER_VALIDATE_EMAIL)) {
                        $mail->addCC($cc);
                    }
                }
            }

            // Generate email content
            $emailContent = $this->generateBookingEmailHTML($orderData);

            // Content
            $mail->isHTML(true); // Email format is HTML
            $mail->Subject = 'Booking Confirmation - GoTickets.lk | Booking ID - ' . $orderData['booking_id']; // Email subject
            $mail->Body = $emailContent; // Email body content

            // Send the email
            $mail->send();
            return ['status' => 'success', 'message' => 'Email Sent Successfully'];
        } catch (Exception $e) {
            // Log the error
            error_log("Email could not be sent. Mailer Error: {$mail->ErrorInfo}");
            $mailError = "Email could not be sent. Mailer Error: {$mail->ErrorInfo}";
            return ['status' => 'error', 'message' => $mailError];
        }
    }

    // ✅ Add installment / payment record to a booking
    public function addInstallmentPayment($bookingId)
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['amount']) || floatval($data['amount']) <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid payment amount is required']);
            return;
        }

        try {
            $result = $this->model->addPaymentRecord($bookingId, [
                'amount' => floatval($data['amount']),
                'payment_method' => $data['payment_method'] ?? 'bank_transfer',
                'payment_slip' => $data['payment_slip'] ?? null,
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null
            ]);

            // If booking is fully paid, send confirmation email if requested
            if ($result['payment_status'] === 'Paid' && !empty($data['send_email'])) {
                try {
                    $bookingInfo = $this->getRecordByIdWithRelationsArray($bookingId);
                    $bookingData = [
                        'booking_id' => $bookingId,
                        'event_name' => $bookingInfo['eventName'],
                        'event_date' => $bookingInfo['eventDate'],
                        'event_location' => $bookingInfo['eventLocation'],
                        'booking_date' => $bookingInfo['bookingDate'],
                        'customer_name' => $bookingInfo['first_name'] . ' ' . $bookingInfo['last_name'],
                        'customer_email' => $bookingInfo['email'],
                        'view_ticket_url' => 'http://localhost:9002/booking-confirmation?order_id=' . $bookingId,
                        'view_bookings_url' => 'http://localhost:9002/account_dashboard',
                        'home_url' => 'http://localhost:9002'
                    ];
                    if (!empty($bookingInfo['email'])) {
                        $this->sendOrderConfirmationEmail($bookingData, $bookingInfo['email']);
                    }
                } catch (Exception $e) {
                    error_log("Failed to send auto email after full payment: " . $e->getMessage());
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'Payment recorded successfully',
                'data' => $result
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ✅ Get payment history for a booking
    public function getBookingPaymentHistory($bookingId)
    {
        try {
            $payments = $this->model->getPaymentsByBookingId($bookingId);
            echo json_encode([
                'success' => true,
                'payments' => $payments
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ✅ Update manual booking details & ticket counts
    public function updateBookingTickets($bookingId)
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid data payload']);
            return;
        }

        try {
            // 1. Update attendee/contact details
            $this->model->updateBooking($bookingId, $data);

            // 2. If updated tickets provided, adjust booking_showtime records & showtime availability
            if (isset($data['tickets']) && is_array($data['tickets'])) {
                $newTotalPrice = 0.00;

                foreach ($data['tickets'] as $ticketItem) {
                    $showtimeTicketId = !empty($ticketItem['id']) ? $ticketItem['id'] : null;
                    $newCount = intval($ticketItem['ticket_count'] ?? 0);
                    $ticketPrice = floatval($ticketItem['price'] ?? 0.00);
                    $ticketTypeId = $ticketItem['tickettype_id'] ?? null;
                    $ticketTypeName = $ticketItem['ticket_type'] ?? $ticketItem['ticketTypeName'] ?? 'Ticket';

                    if ($showtimeTicketId) {
                        if ($newCount <= 0) {
                            $stmt = $this->pdo->prepare("DELETE FROM `booking_showtime` WHERE `id` = ? AND `booking_id` = ?");
                            $stmt->execute([$showtimeTicketId, $bookingId]);
                        } else {
                            $stmt = $this->pdo->prepare("UPDATE `booking_showtime` SET `ticket_count` = ? WHERE `id` = ? AND `booking_id` = ?");
                            $stmt->execute([$newCount, $showtimeTicketId, $bookingId]);
                        }
                    } else if ($newCount > 0) {
                        // Check if this ticket type already exists in booking_showtime
                        $chkStmt = $this->pdo->prepare("SELECT `id` FROM `booking_showtime` WHERE `booking_id` = ? AND `tickettype_id` = ?");
                        $chkStmt->execute([$bookingId, $ticketTypeId]);
                        $existing = $chkStmt->fetch(PDO::FETCH_ASSOC);

                        if ($existing) {
                            $stmt = $this->pdo->prepare("UPDATE `booking_showtime` SET `ticket_count` = ? WHERE `id` = ? AND `booking_id` = ?");
                            $stmt->execute([$newCount, $existing['id'], $bookingId]);
                        } else {
                            $eventId = $ticketItem['eventId'] ?? null;
                            $showtimeId = $ticketItem['showtime_id'] ?? null;
                            $showtime = $ticketItem['showtime'] ?? null;

                            if (!$eventId || !$showtime) {
                                $refStmt = $this->pdo->prepare("SELECT `eventId`, `showtime_id`, `showtime` FROM `booking_showtime` WHERE `booking_id` = ? LIMIT 1");
                                $refStmt->execute([$bookingId]);
                                $refRow = $refStmt->fetch(PDO::FETCH_ASSOC);
                                if ($refRow) {
                                    $eventId = $eventId ?: $refRow['eventId'];
                                    $showtimeId = $showtimeId ?: $refRow['showtime_id'];
                                    $showtime = $showtime ?: $refRow['showtime'];
                                }
                            }

                            if (!$eventId) {
                                $beStmt = $this->pdo->prepare("SELECT `eventId` FROM `booking_event` WHERE `booking_id` = ? LIMIT 1");
                                $beStmt->execute([$bookingId]);
                                $beRow = $beStmt->fetch(PDO::FETCH_ASSOC);
                                if ($beRow) {
                                    $eventId = $beRow['eventId'];
                                }
                            }

                            $insStmt = $this->pdo->prepare("INSERT INTO `booking_showtime` (`booking_id`, `eventId`, `showtime_id`, `ticket_type`, `tickettype_id`, `showtime`, `ticket_count`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
                            $insStmt->execute([
                                $bookingId,
                                $eventId,
                                $showtimeId ?: 1,
                                $ticketTypeName,
                                $ticketTypeId,
                                $showtime ?: date('Y-m-d H:i:s'),
                                $newCount
                            ]);
                        }
                    }

                    if ($newCount > 0) {
                        $newTotalPrice += ($newCount * $ticketPrice);
                    }
                }

                // Update totalPrice & balance_amount
                $currentBooking = $this->model->getBookingById($bookingId);
                $isComp = strtolower($currentBooking['payment_method'] ?? '') === 'complimentary';

                if ($isComp) {
                    $updStmt = $this->pdo->prepare("UPDATE `booking` SET `totalPrice` = ?, `balance_amount` = 0.00, `amount_paid` = 0.00, `payment_status` = 'Paid' WHERE `id` = ?");
                    $updStmt->execute([$newTotalPrice, $bookingId]);
                } else {
                    $amountPaid = floatval($currentBooking['amount_paid'] ?? 0.00);
                    $newBalance = max(0.00, $newTotalPrice - $amountPaid);
                    $newStatus = $newBalance <= 0.00 ? 'Paid' : ($amountPaid > 0 ? 'Partially Paid' : 'pending');

                    $updStmt = $this->pdo->prepare("UPDATE `booking` SET `totalPrice` = ?, `balance_amount` = ?, `payment_status` = ? WHERE `id` = ?");
                    $updStmt->execute([$newTotalPrice, $newBalance, $newStatus, $bookingId]);
                }
            }

            $updatedBooking = $this->model->getBookingById($bookingId);
            echo json_encode([
                'success' => true,
                'message' => 'Booking updated successfully',
                'booking' => $updatedBooking
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ✅ Upload payment slip directly to FTP server under /payment-slips/
    public function uploadSlip()
    {
        try {
            $file = $_FILES['slip'] ?? $_FILES['file'] ?? null;
            if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No valid file uploaded or upload error code: ' . ($file['error'] ?? 'none')]);
                return;
            }

            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

            if (!in_array($extension, $allowedExtensions)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid file extension. Only JPG, PNG, WEBP, and PDF files are allowed.']);
                return;
            }

            if ($file['size'] > 10 * 1024 * 1024) { // 10MB
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'File size exceeds 10MB limit.']);
                return;
            }

            $originalFileName = pathinfo($file['name'], PATHINFO_FILENAME);
            $sanitizedFileName = preg_replace('/[^a-zA-Z0-9\-_]/', '', $originalFileName);
            if (empty($sanitizedFileName)) {
                $sanitizedFileName = 'slip';
            }
            $fileName = $sanitizedFileName . '_' . uniqid() . '_' . time() . '.' . $extension;

            // Move to local temporary directory first
            $localTempPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $fileName;
            if (!move_uploaded_file($file['tmp_name'], $localTempPath)) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to process temporary uploaded slip file.']);
                return;
            }

            // Target path on remote FTP server: /payment-slips/{fileName}
            $ftpFilePath = "/payment-slips/" . $fileName;

            // Upload directly to FTP server
            if ($this->uploadToFTP($localTempPath, $ftpFilePath)) {
                // Remove local temp file
                if (file_exists($localTempPath)) {
                    @unlink($localTempPath);
                }

                $fileUrl = "https://content-provider.gotickets.lk" . $ftpFilePath;

                echo json_encode([
                    'success' => true,
                    'filePath' => $ftpFilePath, // e.g. /payment-slips/receipt_xxx.jpg
                    'fileName' => $fileName,
                    'fileUrl' => $fileUrl       // https://content-provider.gotickets.lk/payment-slips/receipt_xxx.jpg
                ]);
            } else {
                if (file_exists($localTempPath)) {
                    @unlink($localTempPath);
                }
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to upload slip to FTP server. Please verify FTP settings.']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}

