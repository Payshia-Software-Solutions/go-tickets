<?php
require_once dirname(__DIR__, 2) . '/config/env.php';
require_once './models/t/Payment.php';
require_once './controllers/t/BookingController.php';

class PaymentController
{
    public $model;

    private $merchant_id;
    private $merchant_secret;
    private $domainName;
    private $serverUrl;
    private $modePrefix;

    public function __construct($pdo)
    {
        $this->model = new Payment($pdo);
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

    public function initiatePayment($bookingId, $totalAmount, $bookingInfo)
    {
        // $data = json_decode(file_get_contents("php://input"), true);
        // var_dump($data['billingAddress']);

        // Dummy
        $billingAddress = [
            'firstName'   => $bookingInfo['first_name'],
            'lastName'    => $bookingInfo['last_name'],
            'email'       => $bookingInfo['email'],
            'phone'       => $bookingInfo['contact_number'],
            'address'     => '-',
            'city'        => '-',
            'country'     => 'Sri Lanka',
            'postalCode'  => ''
        ];
        $totalAmount = number_format($totalAmount, 2, '.', '');
        $currency = "LKR";
        $token = $this->generateBookingToken($bookingId, $bookingInfo['qrCodeValue'] ?? '');
        $return_url = $this->domainName . "/booking-confirmation?order_id=" . $bookingId . "&token=" . $token;
        $cancel_url = $this->domainName . "/checkout";
        $notify_url = $this->serverUrl . "/bookings/payment/notify";

        // Get shipping address
        // $billingAddress = $data['billingAddress'];
        $items = "Online Booking Tickets";
        $paymentMethod = 'visa';
        $customer_details = [
            'first_name' => $billingAddress['firstName'],
            'last_name' => $billingAddress['lastName'],
            'email' => $billingAddress['email'],
            'phone' => $billingAddress['phone'],
            'address' => $billingAddress['address'],
            'city' => $billingAddress['city'],
            'country' => $billingAddress['country'],
            'postal_code' => $billingAddress['postalCode']
        ];


        // Generate the hash for security
        $hash = $this->generateHash($bookingId, $totalAmount, $currency);

        // Prepare the form data for submission
        $form_data = array_merge([
            'merchant_id' => $this->merchant_id,
            'return_url' => $return_url,
            'cancel_url' => $cancel_url,
            'notify_url' => $notify_url,
            'order_id' => $bookingId,
            'items' => $items, // Order items in a readable string format
            'currency' => $currency,
            'amount' => $totalAmount,
            'paymentMethod' => $paymentMethod, // Selected payment method
            'hash' => $hash
        ], $customer_details);

        // Generate the HTML form that will auto-submit to PayHere checkout
        $html = '<html><body onload="document.forms[0].submit();">';
        $html .= '<form method="post" action="https://' . $this->modePrefix . '.payhere.lk/pay/checkout">';

        foreach ($form_data as $key => $value) {
            $html .= '<input type="hidden" name="' . htmlspecialchars($key) . '" value="' . htmlspecialchars($value) . '">';
        }
        $html .= "Redirecting...";
        $html .= '</form></body></html>';
        return $html;
    }

    private function generateHash($invoiceNumber, $totalAmount, $currency)
    {
        return strtoupper(
            md5(
                $this->merchant_id .
                    $invoiceNumber .
                    $totalAmount .
                    $currency .
                    strtoupper(md5($this->merchant_secret))
            )
        );
    }

    // Get all payments
    public function getAllRecords()
    {
        $records = $this->model->getAllPayments();
        echo json_encode($records);
    }

    // Get payment by ID
    public function getRecordById($id)
    {
        $record = $this->model->getPaymentById($id);
        if ($record) {
            echo json_encode($record);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Payment not found']);
        }
    }

    // Create new payment
    public function createRecord($data = null)
    {
        // Support both direct call and raw JSON body
        if ($data === null) {
            $data = json_decode(file_get_contents("php://input"), true);
        }

        if (
            $data && isset($data['rec_number']) && isset($data['payment_type']) &&
            isset($data['payment_amount']) && isset($data['payment_status']) &&
            isset($data['created_by']) && isset($data['reference_id'])
        ) {
            $this->model->createPayment($data);
            http_response_code(201);
            echo json_encode(['message' => 'Payment created successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }


    // Update payment
    public function updateRecord($id)
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if (
            $data && isset($data['rec_number']) && isset($data['payment_type']) &&
            isset($data['payment_amount']) && isset($data['payment_status']) &&
            isset($data['created_by']) && isset($data['created_at']) &&
            isset($data['reference_id'])
        ) {
            $this->model->updatePayment($id, $data);
            echo json_encode(['message' => 'Payment updated successfully']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
        }
    }

    // Delete payment
    public function deleteRecord($id)
    {
        $this->model->deletePayment($id);
        echo json_encode(['message' => 'Payment deleted successfully']);
    }
}
