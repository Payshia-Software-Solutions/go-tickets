<?php
require_once './models/t/Payment.php';
require_once './controllers/t/BookingController.php';

class PaymentController
{
    public $model;

    // @Local Keys
    // private $merchant_id = '1227940'; // Your merchant ID
    // private $merchant_secret = 'MzQwODQyMDI3MjkxODYwMzI2MDM0MTU2MjIxNjgyNTcxNjAyNTk='; // Your merchant secret
    // private $domainName = 'https://gotickets.silverray.lk';
    // private $serverUrl = 'https://gotickets-server.payshia.com';
    // private $modePrefix = "sandbox";

    // @Live Keys
    private $merchant_id = '245438'; // Your merchant ID
    private $merchant_secret = 'MTQ3NzA0NDI1MjIwNzYzNTcyODM3ODk2ODY0ODI4MDY3ODM0MTU='; // Your merchant secret
    private $domainName = 'https://gotickets.silverray.lk';
    private $serverUrl = 'https://gotickets-server.payshia.com';
    private $modePrefix = "www";

    public function __construct($pdo)
    {
        $this->model = new Payment($pdo);
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
        $return_url = $this->domainName . "/booking-confirmation";
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
