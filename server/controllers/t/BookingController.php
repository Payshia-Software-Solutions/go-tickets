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
use Dompdf\Dompdf;
use Dompdf\Options;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

$autoloadPath = dirname(__DIR__, 2) . '/vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
} elseif (file_exists('./vendor/autoload.php')) {
    require_once './vendor/autoload.php';
}

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

    public function generateBookingToken($bookingId, $qrCodeValue = '')
    {
        $secret = env('APP_KEY', env('PAYHERE_MERCHANT_SECRET', 'gotickets_secure_token_secret_2026'));
        return substr(hash_hmac('sha256', $bookingId . '_' . $qrCodeValue, $secret), 0, 32);
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
            $record['token'] = $this->generateBookingToken($id, $record['qrCodeValue'] ?? '');
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found']);
        }
    }

    // ✅ Get bookings by user ID (defaults to last 5 bookings, newest first)
    public function getRecordsByUserId($userId)
    {
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 5;
        $records = $this->model->getBookingsByUserId($userId, $limit);
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

        // Add secure access token
        $booking['token'] = $this->generateBookingToken($id, $booking['qrCodeValue'] ?? '');

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

        // Add secure access token
        $booking['token'] = $this->generateBookingToken($id, $booking['qrCodeValue'] ?? '');

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

                $customerName = trim(($bookingInfo['first_name'] ?? '') . ' ' . ($bookingInfo['last_name'] ?? ''));
                if (empty($customerName) && !empty($bookingInfo['user_billing_info']['name'])) {
                    $customerName = $bookingInfo['user_billing_info']['name'];
                }

                $token = $bookingInfo['token'] ?? $this->generateBookingToken($bookingId, $bookingInfo['qrCodeValue'] ?? '');
                $domain = rtrim(env('PAYHERE_DOMAIN_NAME', 'https://gotickets.silverray.lk'), '/');

                $bookingData = [
                    'booking_id' => $bookingId,
                    'event_name' => $bookingInfo['eventName'],
                    'event_date' => $bookingInfo['eventDate'], // MySQL datetime format
                    'event_location' => $bookingInfo['eventLocation'],
                    'booking_date' => $bookingInfo['bookingDate'], // When booking was made
                    'customer_name' => $customerName,
                    'customer_email' => $bookingInfo['email'],
                    'total_price' => $bookingInfo['totalPrice'],
                    'amount_paid' => $payhere_amount,
                    'balance_amount' => $bookingInfo['balance_amount'] ?? 0,
                    'payment_status' => 'Paid',
                    'qr_code_value' => $bookingInfo['qrCodeValue'],
                    'view_ticket_url' => $domain . '/booking-confirmation?order_id=' . $bookingId . '&token=' . $token,
                    'view_bookings_url' => $domain . '/booking-confirmation?order_id=' . $bookingId . '&token=' . $token,
                    'home_url' => $domain
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
        $bookingId = isset($_GET['id']) ? intval($_GET['id']) : 385;
        $bookingInfo = $this->getRecordByIdWithRelationsArray($bookingId);
        if (!$bookingInfo) {
            $bookingId = 1;
            $bookingInfo = $this->getRecordByIdWithRelationsArray($bookingId);
        }

        if (!$bookingInfo) {
            echo json_encode(['status' => 'error', 'message' => 'No booking record found for testing']);
            return;
        }

        $customerName = trim(($bookingInfo['first_name'] ?? '') . ' ' . ($bookingInfo['last_name'] ?? ''));
        if (empty($customerName) && !empty($bookingInfo['user_billing_info']['name'])) {
            $customerName = $bookingInfo['user_billing_info']['name'];
        }

        $targetEmail = isset($_GET['email']) ? trim($_GET['email']) : ($bookingInfo['email'] ?? 'thilinaruwan112@gmail.com');
        $domain = rtrim(env('PAYHERE_DOMAIN_NAME', 'https://gotickets.silverray.lk'), '/');
        $token = $bookingInfo['token'] ?? $this->generateBookingToken($bookingId, $bookingInfo['qrCodeValue'] ?? '');

        $bookingData = [
            'booking_id' => $bookingId,
            'event_name' => $bookingInfo['eventName'],
            'event_date' => $bookingInfo['eventDate'], // MySQL datetime format
            'event_location' => $bookingInfo['eventLocation'],
            'booking_date' => $bookingInfo['bookingDate'], // When booking was made
            'customer_name' => $customerName,
            'customer_email' => $targetEmail,
            'total_price' => $bookingInfo['totalPrice'],
            'amount_paid' => $bookingInfo['amount_paid'] ?? $bookingInfo['totalPrice'],
            'balance_amount' => $bookingInfo['balance_amount'] ?? 0,
            'payment_status' => $bookingInfo['payment_status'] ?? 'Paid',
            'qr_code_value' => $bookingInfo['qrCodeValue'],
            'view_ticket_url' => $domain . '/booking-confirmation?order_id=' . $bookingId . '&token=' . $token,
            'view_bookings_url' => $domain . '/account_dashboard',
            'home_url' => $domain
        ];

        $emailResult = $this->sendOrderConfirmationEmail($bookingData, $targetEmail);

        // Output the result as JSON
        echo json_encode([
            'status' => $emailResult['status'],
            'message' => $emailResult['message'],
            'booking_id' => $bookingId,
            'recipient' => $targetEmail
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

    public function generateBookingEmailHTML($bookingData, $bookingInfo = null)
    {
        // Load the email template
        $templateFile = './templates/booking_confirmation_template.html';
        if (!file_exists($templateFile)) {
            $templateFile = __DIR__ . '/../../templates/booking_confirmation_template.html';
        }
        if (!file_exists($templateFile)) {
            throw new Exception("Email template file not found: {$templateFile}");
        }

        $emailTemplate = file_get_contents($templateFile);

        $bookingId = $bookingData['booking_id'] ?? null;
        if (!$bookingInfo && $bookingId) {
            $bookingInfo = $this->getRecordByIdWithRelationsArray($bookingId);
        }

        // Format dates
        $eventDateTime = date('l, F j, Y \a\t g:i A', strtotime($bookingData['event_date']));
        $eventDateOnly = date('n/j/Y', strtotime($bookingData['event_date']));
        $bookingTimestamp = !empty($bookingData['booking_date'])
            ? date('F j, Y \a\t g:i A', strtotime($bookingData['booking_date']))
            : date('F j, Y \a\t g:i A');

        // Customer name
        $customerName = trim($bookingData['customer_name'] ?? '');
        if (empty($customerName) && !empty($bookingInfo['first_name'])) {
            $customerName = trim($bookingInfo['first_name'] . ' ' . ($bookingInfo['last_name'] ?? ''));
        }
        if (empty($customerName) && !empty($bookingInfo['user_billing_info']['name'])) {
            $customerName = $bookingInfo['user_billing_info']['name'];
        }
        if (empty($customerName)) {
            $customerName = 'Valued Customer';
        }

        // Ticket tiers rows
        $tickets = [];
        if (!empty($bookingInfo['booking_event'])) {
            foreach ($bookingInfo['booking_event'] as $be) {
                if (!empty($be['booking_showtime'])) {
                    foreach ($be['booking_showtime'] as $st) {
                        $tickets[] = [
                            'type' => $st['ticket_type'] ?? 'Standard',
                            'count' => intval($st['ticket_count'] ?? 1),
                            'time' => !empty($st['showtime']) ? date('g:i A', strtotime($st['showtime'])) : date('g:i A', strtotime($bookingData['event_date'])),
                        ];
                    }
                }
            }
        }
        if (empty($tickets)) {
            $tickets[] = [
                'type' => 'General Admission',
                'count' => 1,
                'time' => date('g:i A', strtotime($bookingData['event_date'])),
            ];
        }

        $ticketRowsHtml = '';
        foreach ($tickets as $t) {
            $ticketRowsHtml .= '<tr>';
            $ticketRowsHtml .= '<td style="padding: 10px 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">' . htmlspecialchars($t['type']) . '</td>';
            $ticketRowsHtml .= '<td style="padding: 10px 12px; text-align: center; font-weight: bold; color: #2563eb; border-bottom: 1px solid #f1f5f9;">' . $t['count'] . '</td>';
            $ticketRowsHtml .= '<td style="padding: 10px 12px; text-align: right; color: #64748b; border-bottom: 1px solid #f1f5f9;">' . htmlspecialchars($t['time']) . '</td>';
            $ticketRowsHtml .= '</tr>';
        }

        // Financial figures
        $totalPrice = floatval($bookingData['total_price'] ?? $bookingInfo['totalPrice'] ?? 0);
        $amountPaid = floatval($bookingData['amount_paid'] ?? $bookingInfo['amount_paid'] ?? $totalPrice);
        $balanceDue = floatval($bookingData['balance_amount'] ?? $bookingInfo['balance_amount'] ?? max(0, $totalPrice - $amountPaid));

        $totalPriceFormatted = number_format($totalPrice, 2);
        $amountPaidFormatted = number_format($amountPaid, 2);
        $balanceDueFormatted = number_format($balanceDue, 2);

        $balanceDueRow = '';
        if ($balanceDue > 0) {
            $balanceDueRow = '<tr class="order-summary-row"><td colspan="2" style="padding: 6px 12px; font-weight: 600; color: #d97706;">Balance Due at Venue:</td><td style="padding: 6px 12px; text-align: right; font-weight: 700; color: #d97706;">LKR ' . $balanceDueFormatted . '</td></tr>';
        }

        $paymentStatus = strtolower($bookingData['payment_status'] ?? $bookingInfo['payment_status'] ?? 'paid');
        $isPaid = ($paymentStatus === 'paid' || $balanceDue <= 0);
        $statusBadgeHtml = $isPaid 
            ? '<span class="status-badge" style="display: inline-block; background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px;">&#10003; PAYMENT CONFIRMED</span>'
            : '<span class="status-badge" style="display: inline-block; background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px;">&#9679; ADVANCE CONFIRMED (PARTIAL)</span>';

        $qrCodeVal = $bookingData['qr_code_value'] ?? $bookingInfo['qrCodeValue'] ?? ('BOOK-' . $bookingId);
        $viewTicketUrl = $bookingData['view_ticket_url'] ?? ('https://gotickets.silverray.lk/booking-confirmation?order_id=' . $bookingId);
        $viewBookingsUrl = $bookingData['view_bookings_url'] ?? 'https://gotickets.silverray.lk/account_dashboard';
        $homeUrl = $bookingData['home_url'] ?? 'https://gotickets.silverray.lk';

        // Replace placeholders with booking data
        $placeholders = [
            '{{EVENT_NAME}}' => htmlspecialchars($bookingData['event_name'] ?? $bookingInfo['eventName'] ?? ''),
            '{{EVENT_DATE}}' => $eventDateOnly,
            '{{EVENT_DATE_TIME}}' => $eventDateTime,
            '{{EVENT_LOCATION}}' => htmlspecialchars($bookingData['event_location'] ?? $bookingInfo['eventLocation'] ?? ''),
            '{{BOOKING_ID}}' => htmlspecialchars((string)$bookingId),
            '{{VIEW_TICKET_URL}}' => htmlspecialchars($viewTicketUrl),
            '{{VIEW_BOOKINGS_URL}}' => htmlspecialchars($viewBookingsUrl),
            '{{HOME_URL}}' => htmlspecialchars($homeUrl),
            '{{CUSTOMER_NAME}}' => htmlspecialchars($customerName),
            '{{CUSTOMER_EMAIL}}' => htmlspecialchars($bookingData['customer_email'] ?? $bookingInfo['email'] ?? ''),
            '{{YEAR}}' => date('Y'),
            '{{TOTAL_PRICE}}' => $totalPriceFormatted,
            '{{AMOUNT_PAID}}' => $amountPaidFormatted,
            '{{BALANCE_DUE_ROW}}' => $balanceDueRow,
            '{{TICKET_ROWS}}' => $ticketRowsHtml,
            '{{PAYMENT_STATUS_BADGE}}' => $statusBadgeHtml,
            '{{QR_CODE_SRC}}' => 'cid:ticket_qr',
            '{{QR_CODE_VALUE}}' => htmlspecialchars($qrCodeVal),
        ];

        // Replace all placeholders
        foreach ($placeholders as $placeholder => $value) {
            $emailTemplate = str_replace($placeholder, $value, $emailTemplate);
        }

        return $emailTemplate;
    }

    public function generateTicketPDF($bookingData, $bookingInfo = null)
    {
        $bookingId = $bookingData['booking_id'] ?? null;
        if (!$bookingInfo && $bookingId) {
            $bookingInfo = $this->getRecordByIdWithRelationsArray($bookingId);
        }

        $qrCodeValue = $bookingData['qr_code_value'] 
            ?? $bookingInfo['qrCodeValue'] 
            ?? ('BOOK-' . $bookingId);

        // Generate QR Code as base64 PNG data URI for Dompdf
        $qrOptions = new QROptions([
            'outputType' => QRCode::OUTPUT_IMAGE_PNG,
            'eccLevel' => QRCode::ECC_M,
            'scale' => 6,
            'imageBase64' => true,
        ]);
        $qrCodeDataUri = (new QRCode($qrOptions))->render($qrCodeValue);

        $customerName = trim($bookingData['customer_name'] ?? '');
        if (empty($customerName) && !empty($bookingInfo['first_name'])) {
            $customerName = trim($bookingInfo['first_name'] . ' ' . ($bookingInfo['last_name'] ?? ''));
        }
        if (empty($customerName) && !empty($bookingInfo['user_billing_info']['name'])) {
            $customerName = $bookingInfo['user_billing_info']['name'];
        }
        if (empty($customerName)) {
            $customerName = 'Valued Customer';
        }

        $customerContact = $bookingData['customer_email'] 
            ?? $bookingInfo['email'] 
            ?? $bookingInfo['contact_number'] 
            ?? 'N/A';

        $eventName = $bookingData['event_name'] ?? $bookingInfo['eventName'] ?? 'Event';
        $eventDate = $bookingData['event_date'] ?? $bookingInfo['eventDate'] ?? date('Y-m-d H:i:s');
        $eventLocation = $bookingData['event_location'] ?? $bookingInfo['eventLocation'] ?? 'Sri Lanka';
        $bookingDate = $bookingData['booking_date'] ?? $bookingInfo['bookingDate'] ?? date('Y-m-d H:i:s');

        $eventDateFormatted = date('l, F j, Y', strtotime($eventDate));
        $eventTimeFormatted = date('g:i A', strtotime($eventDate));
        $issuedDateFormatted = date('F j, Y', strtotime($bookingDate));

        // Collect ticket items
        $tickets = [];
        if (!empty($bookingInfo['booking_event'])) {
            foreach ($bookingInfo['booking_event'] as $be) {
                if (!empty($be['booking_showtime'])) {
                    foreach ($be['booking_showtime'] as $st) {
                        $tickets[] = [
                            'type' => $st['ticket_type'] ?? 'Standard',
                            'count' => intval($st['ticket_count'] ?? 1),
                            'time' => !empty($st['showtime']) ? date('g:i A', strtotime($st['showtime'])) : $eventTimeFormatted,
                        ];
                    }
                }
            }
        }
        if (empty($tickets)) {
            $tickets[] = [
                'type' => 'General Admission',
                'count' => 1,
                'time' => $eventTimeFormatted
            ];
        }

        $totalQuantity = array_sum(array_column($tickets, 'count'));
        $totalPrice = floatval($bookingData['total_price'] ?? $bookingInfo['totalPrice'] ?? 0);
        $amountPaid = floatval($bookingData['amount_paid'] ?? $bookingInfo['amount_paid'] ?? $totalPrice);
        $balanceDue = floatval($bookingData['balance_amount'] ?? $bookingInfo['balance_amount'] ?? max(0, $totalPrice - $amountPaid));

        $totalPriceFormatted = number_format($totalPrice, 2);
        $amountPaidFormatted = number_format($amountPaid, 2);
        $balanceDueFormatted = number_format($balanceDue, 2);

        $paymentStatus = strtolower($bookingData['payment_status'] ?? $bookingInfo['payment_status'] ?? 'paid');
        $isPaid = ($paymentStatus === 'paid' || $balanceDue <= 0);

        $ticketRowsHtml = '';
        foreach ($tickets as $t) {
            $ticketRowsHtml .= '<tr>';
            $ticketRowsHtml .= '<td style="font-weight: 600; color: #0f172a;">' . htmlspecialchars($t['type']) . '</td>';
            $ticketRowsHtml .= '<td style="text-align: center; font-weight: bold; color: #2563eb;">' . $t['count'] . '</td>';
            $ticketRowsHtml .= '<td style="text-align: right; color: #64748b;">' . htmlspecialchars($t['time']) . '</td>';
            $ticketRowsHtml .= '</tr>';
        }

        $balanceDueRowHtml = '';
        if ($balanceDue > 0) {
            $balanceDueRowHtml = '<tr><td style="color: #d97706; font-weight: bold;">Balance Due at Venue:</td><td style="text-align: right; font-weight: bold; color: #d97706;">LKR ' . $balanceDueFormatted . '</td></tr>';
        }

        $pdfHtml = '
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>GoTickets E-Ticket - #' . htmlspecialchars((string)$bookingId) . '</title>
<style>
    @page {
        margin: 20px 25px;
        size: A4 portrait;
    }
    body {
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #1e293b;
        background-color: #ffffff;
        margin: 0;
        padding: 0;
        font-size: 13px;
        line-height: 1.4;
    }
    .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 12px;
    }
    .brand-logo {
        font-size: 26px;
        font-weight: bold;
        color: #0f172a;
        letter-spacing: -0.5px;
    }
    .brand-blue { color: #2563eb; }
    .brand-orange { color: #ff6b35; }
    .header-badge {
        text-align: right;
    }
    .badge-pass {
        display: inline-block;
        background-color: #0f172a;
        color: #ffffff;
        font-size: 11px;
        font-weight: bold;
        padding: 6px 14px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    .ticket-container {
        width: 100%;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        background-color: #ffffff;
        margin-bottom: 20px;
    }
    
    .ticket-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .main-pass-td {
        width: 68%;
        padding: 24px;
        vertical-align: top;
        border-right: 2px dashed #cbd5e1;
    }
    
    .stub-td {
        width: 32%;
        padding: 24px 16px;
        vertical-align: top;
        text-align: center;
        background-color: #f8fafc;
        border-top-right-radius: 10px;
        border-bottom-right-radius: 10px;
    }
    
    .event-title {
        font-size: 22px;
        font-weight: bold;
        color: #0f172a;
        margin: 0 0 6px 0;
    }
    
    .event-subtitle {
        font-size: 12px;
        color: #64748b;
        margin: 0 0 18px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .meta-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
    }
    
    .meta-label {
        font-size: 10px;
        text-transform: uppercase;
        color: #64748b;
        font-weight: bold;
        letter-spacing: 0.5px;
        padding-bottom: 3px;
    }
    
    .meta-value {
        font-size: 13px;
        font-weight: 600;
        color: #0f172a;
        padding-bottom: 12px;
    }
    
    .tickets-table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0 16px 0;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
    }
    
    .tickets-table th {
        background-color: #f1f5f9;
        color: #475569;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 7px 10px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .tickets-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 12px;
    }
    
    .finance-box {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 14px;
        margin-top: 10px;
    }
    
    .finance-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .finance-table td {
        padding: 2px 0;
        font-size: 12px;
    }
    
    .status-badge-paid {
        display: inline-block;
        background-color: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
    }
    
    .status-badge-pending {
        display: inline-block;
        background-color: #fffbeb;
        color: #92400e;
        border: 1px solid #fde68a;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
    }
    
    .stub-ref-label {
        font-size: 10px;
        text-transform: uppercase;
        color: #64748b;
        font-weight: bold;
        letter-spacing: 0.5px;
    }
    
    .stub-ref-id {
        font-size: 18px;
        font-weight: bold;
        color: #2563eb;
        font-family: monospace;
        margin: 2px 0 14px 0;
    }
    
    .qr-box {
        background-color: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 8px;
        display: inline-block;
        margin-bottom: 8px;
    }
    
    .qr-code-img {
        width: 140px;
        height: 140px;
        display: block;
    }
    
    .qr-text {
        font-family: monospace;
        font-size: 9px;
        color: #64748b;
        word-break: break-all;
        margin-bottom: 12px;
    }
    
    .stub-instructions {
        font-size: 10px;
        color: #475569;
        line-height: 1.3;
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 8px;
    }

    .guidelines {
        margin-top: 15px;
        padding: 14px 18px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
    }
    
    .guidelines-title {
        font-size: 11px;
        font-weight: bold;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
    }
    
    .guidelines ul {
        margin: 0;
        padding-left: 18px;
        font-size: 10.5px;
        color: #475569;
        line-height: 1.5;
    }
    
    .footer {
        margin-top: 20px;
        text-align: center;
        font-size: 10px;
        color: #94a3b8;
        border-top: 1px solid #e2e8f0;
        padding-top: 12px;
    }
</style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="vertical-align: middle;">
                <div class="brand-logo">GoTickets<span class="brand-blue">.</span><span class="brand-orange">lk</span></div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Sri Lanka\'s Premier Online Event Ticketing Platform</div>
            </td>
            <td class="header-badge" style="vertical-align: middle;">
                <div class="badge-pass">Official E-Ticket</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Issued on ' . $issuedDateFormatted . '</div>
            </td>
        </tr>
    </table>

    <div class="ticket-container">
        <table class="ticket-table">
            <tr>
                <td class="main-pass-td">
                    <h1 class="event-title">' . htmlspecialchars($eventName) . '</h1>
                    <div class="event-subtitle">Official Admission Pass &bull; ' . $totalQuantity . ' Ticket' . ($totalQuantity > 1 ? 's' : '') . '</div>

                    <table class="meta-table">
                        <tr>
                            <td style="width: 50%;">
                                <div class="meta-label">Date & Time</div>
                                <div class="meta-value">' . $eventDateFormatted . '<br><span style="color:#2563eb;">' . $eventTimeFormatted . '</span></div>
                            </td>
                            <td style="width: 50%;">
                                <div class="meta-label">Venue Location</div>
                                <div class="meta-value">' . htmlspecialchars($eventLocation) . '</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div class="meta-label">Attendee Name</div>
                                <div class="meta-value">' . htmlspecialchars($customerName) . '</div>
                            </td>
                            <td>
                                <div class="meta-label">Contact / Email</div>
                                <div class="meta-value">' . htmlspecialchars($customerContact) . '</div>
                            </td>
                        </tr>
                    </table>

                    <table class="tickets-table">
                        <thead>
                            <tr>
                                <th>Ticket Tier</th>
                                <th style="text-align: center; width: 60px;">Qty</th>
                                <th style="text-align: right; width: 100px;">Showtime</th>
                            </tr>
                        </thead>
                        <tbody>' . $ticketRowsHtml . '</tbody>
                    </table>

                    <div class="finance-box">
                        <table class="finance-table">
                            <tr>
                                <td style="color: #64748b;">Payment Status:</td>
                                <td style="text-align: right;">' . ($isPaid ? '<span class="status-badge-paid">&check; Fully Paid</span>' : '<span class="status-badge-pending">Partially Paid / Pending</span>') . '</td>
                            </tr>
                            <tr>
                                <td style="color: #64748b;">Total Amount:</td>
                                <td style="text-align: right; font-weight: bold; color: #0f172a;">LKR ' . $totalPriceFormatted . '</td>
                            </tr>
                            <tr>
                                <td style="color: #64748b;">Amount Paid:</td>
                                <td style="text-align: right; font-weight: bold; color: #059669;">LKR ' . $amountPaidFormatted . '</td>
                            </tr>' . $balanceDueRowHtml . '
                        </table>
                    </div>
                </td>

                <td class="stub-td">
                    <div class="stub-ref-label">Booking Reference</div>
                    <div class="stub-ref-id">#' . htmlspecialchars((string)$bookingId) . '</div>

                    <div class="qr-box">
                        <img src="' . $qrCodeDataUri . '" class="qr-code-img" alt="QR Code" />
                    </div>

                    <div class="qr-text">' . htmlspecialchars($qrCodeValue) . '</div>

                    <div class="stub-instructions">
                        <strong>&bull; SCAN FOR ENTRY &bull;</strong><br>
                        Present this QR code on mobile or printed copy at the entrance scanner.
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <div class="guidelines">
        <div class="guidelines-title">Important Admission Guidelines</div>
        <ul>
            <li>Please have this e-ticket ready along with a valid photo ID (NIC / Driving License / Passport) at the entry gate.</li>
            <li>Each QR code is cryptographically unique and will only grant admission for one verification. Duplication or resale is strictly prohibited.</li>
            <li>Gates typically open 1 hour before scheduled showtime. Please arrive early to avoid queue delays.</li>
            <li>Tickets are non-refundable and subject to the terms and conditions of GoTickets.lk and event organizers.</li>
        </ul>
    </div>

    <div class="footer">
        GoTickets.lk &bull; Grand Silver Ray, Pelmadulla, Sri Lanka &bull; Support: support@gotickets.lk | +94 71 910 7700<br>
        &copy; ' . date('Y') . ' GoTickets.lk. All rights reserved.
    </div>

</body>
</html>
';

        $pdfOptions = new Options();
        $pdfOptions->set('isRemoteEnabled', true);
        $pdfOptions->set('isHtml5ParserEnabled', true);
        $pdfOptions->set('defaultFont', 'Helvetica');

        $dompdf = new Dompdf($pdfOptions);
        $dompdf->loadHtml($pdfHtml);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    public function sendOrderConfirmationEmail($orderData, $customerEmail)
    {
        $mail = new PHPMailer(true);

        try {
            $bookingId = $orderData['booking_id'] ?? null;
            $bookingInfo = $bookingId ? $this->getRecordByIdWithRelationsArray($bookingId) : null;

            // Normalize missing fields from booking relations if available
            if ($bookingInfo) {
                if (empty($orderData['customer_name'])) {
                    $orderData['customer_name'] = trim(($bookingInfo['first_name'] ?? '') . ' ' . ($bookingInfo['last_name'] ?? ''));
                    if (empty($orderData['customer_name']) && !empty($bookingInfo['user_billing_info']['name'])) {
                        $orderData['customer_name'] = $bookingInfo['user_billing_info']['name'];
                    }
                }
                if (empty($orderData['qr_code_value'])) {
                    $orderData['qr_code_value'] = $bookingInfo['qrCodeValue'] ?? ('BOOK-' . $bookingId);
                }
                if (!isset($orderData['total_price'])) {
                    $orderData['total_price'] = $bookingInfo['totalPrice'] ?? 0;
                }
                if (!isset($orderData['amount_paid'])) {
                    $orderData['amount_paid'] = $bookingInfo['amount_paid'] ?? $orderData['total_price'];
                }
                if (!isset($orderData['balance_amount'])) {
                    $orderData['balance_amount'] = $bookingInfo['balance_amount'] ?? 0;
                }
                if (!isset($orderData['payment_status'])) {
                    $orderData['payment_status'] = $bookingInfo['payment_status'] ?? 'Paid';
                }
            }

            // Server settings from environment
            $mail->isSMTP();
            $mail->CharSet = 'UTF-8';
            $mail->Encoding = 'base64';
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

            // 1. Generate & embed QR Code into email body
            $qrCodeVal = $orderData['qr_code_value'] ?? ('BOOK-' . $bookingId);
            $qrOptionsRaw = new QROptions([
                'outputType' => QRCode::OUTPUT_IMAGE_PNG,
                'eccLevel' => QRCode::ECC_M,
                'scale' => 6,
                'imageBase64' => false,
            ]);
            $qrPngBinary = (new QRCode($qrOptionsRaw))->render($qrCodeVal);
            $mail->addStringEmbeddedImage($qrPngBinary, 'ticket_qr', 'qrcode.png', 'base64', 'image/png');

            // 2. Generate PDF Ticket and attach to email
            try {
                $pdfBytes = $this->generateTicketPDF($orderData, $bookingInfo);
                if (!empty($pdfBytes)) {
                    $pdfFileName = 'GoTickets_Ticket_' . $orderData['booking_id'] . '.pdf';
                    $mail->addStringAttachment($pdfBytes, $pdfFileName, 'base64', 'application/pdf');
                }
            } catch (Exception $pdfEx) {
                error_log("Failed to generate/attach PDF ticket: " . $pdfEx->getMessage());
            }

            // 3. Generate HTML email content
            $emailContent = $this->generateBookingEmailHTML($orderData, $bookingInfo);

            // Content
            $mail->isHTML(true); // Email format is HTML
            $mail->Subject = 'Booking Confirmation - GoTickets.lk | ' . $orderData['event_name'] . ' [Ref: #' . $orderData['booking_id'] . ']';
            $mail->Body = $emailContent;

            // Send the email
            $mail->send();
            return ['status' => 'success', 'message' => 'Email Sent Successfully with PDF Attachment'];
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
                    $customerName = trim(($bookingInfo['first_name'] ?? '') . ' ' . ($bookingInfo['last_name'] ?? ''));
                    if (empty($customerName) && !empty($bookingInfo['user_billing_info']['name'])) {
                        $customerName = $bookingInfo['user_billing_info']['name'];
                    }
                    $domain = rtrim(env('PAYHERE_DOMAIN_NAME', 'https://gotickets.silverray.lk'), '/');
                    $token = $bookingInfo['token'] ?? $this->generateBookingToken($bookingId, $bookingInfo['qrCodeValue'] ?? '');
                    $bookingData = [
                        'booking_id' => $bookingId,
                        'event_name' => $bookingInfo['eventName'],
                        'event_date' => $bookingInfo['eventDate'],
                        'event_location' => $bookingInfo['eventLocation'],
                        'booking_date' => $bookingInfo['bookingDate'],
                        'customer_name' => $customerName,
                        'customer_email' => $bookingInfo['email'],
                        'total_price' => $bookingInfo['totalPrice'],
                        'amount_paid' => $bookingInfo['amount_paid'] ?? $bookingInfo['totalPrice'],
                        'balance_amount' => $bookingInfo['balance_amount'] ?? 0,
                        'payment_status' => $bookingInfo['payment_status'] ?? 'Paid',
                        'qr_code_value' => $bookingInfo['qrCodeValue'],
                        'view_ticket_url' => $domain . '/booking-confirmation?order_id=' . $bookingId . '&token=' . $token,
                        'view_bookings_url' => $domain . '/account_dashboard',
                        'home_url' => $domain
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

