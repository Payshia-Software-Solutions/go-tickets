<?php
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';
require_once './models/t/ContactMessage.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class ContactController
{
    private $pdo;
    private $model;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->model = new ContactMessage($pdo);
    }

    public function submitMessage()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty(trim($data['name'] ?? '')) || empty(trim($data['email'] ?? '')) || empty(trim($data['subject'] ?? '')) || empty(trim($data['message'] ?? ''))) {
            http_response_code(400);
            echo json_encode(['error' => 'Please fill in all required fields (Name, Email, Subject, Message).']);
            return;
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Please provide a valid email address.']);
            return;
        }

        try {
            // 1. Save message to database
            $msgId = $this->model->saveMessage($data);

            // 2. Send email notification via PHPMailer
            $this->sendEmailNotification($data, $msgId);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Thank you! Your message has been sent successfully. Our support team will get back to you shortly.',
                'id' => $msgId
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to process inquiry: ' . $e->getMessage()]);
        }
    }

    public function getMessages()
    {
        $messages = $this->model->getAllMessages();
        echo json_encode($messages);
    }

    private function sendEmailNotification($data, $msgId)
    {
        try {
            $mail = new PHPMailer(true);
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

            $fromEmail = env('SMTP_FROM_EMAIL', 'no-reply@gotickets.lk');
            $fromName  = env('SMTP_FROM_NAME', 'GoTickets.lk Support');
            $mail->setFrom($fromEmail, $fromName);

            // Primary support inbox
            $mail->addAddress('support@gotickets.lk', 'GoTickets Support');
            $mail->addAddress('reservation@silverray.lk', 'Silver Ray Reservations');
            $mail->addReplyTo($data['email'], $data['name']);

            $mail->isHTML(true);
            $mail->Subject = "[Website Inquiry #" . $msgId . "] " . $data['subject'];

            $safeName = htmlspecialchars($data['name']);
            $safeEmail = htmlspecialchars($data['email']);
            $safeSubject = htmlspecialchars($data['subject']);
            $safeMessage = nl2br(htmlspecialchars($data['message']));
            $now = date('Y-m-d H:i:s');

            $mail->Body = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                    <h2 style='color: #1e293b; border-bottom: 2px solid #ea580c; padding-bottom: 10px;'>New Website Contact Inquiry</h2>
                    <p style='color: #64748b; font-size: 14px;'>A visitor has sent a message via the GoTickets.lk contact form:</p>
                    
                    <table style='width: 100%; border-collapse: collapse; margin: 20px 0;'>
                        <tr>
                            <td style='padding: 8px; font-weight: bold; color: #475569; width: 120px;'>Name:</td>
                            <td style='padding: 8px; color: #1e293b;'>{$safeName}</td>
                        </tr>
                        <tr style='background-color: #f8fafc;'>
                            <td style='padding: 8px; font-weight: bold; color: #475569;'>Email:</td>
                            <td style='padding: 8px; color: #1e293b;'><a href='mailto:{$safeEmail}'>{$safeEmail}</a></td>
                        </tr>
                        <tr>
                            <td style='padding: 8px; font-weight: bold; color: #475569;'>Subject:</td>
                            <td style='padding: 8px; color: #1e293b;'>{$safeSubject}</td>
                        </tr>
                        <tr style='background-color: #f8fafc;'>
                            <td style='padding: 8px; font-weight: bold; color: #475569;'>Date/Time:</td>
                            <td style='padding: 8px; color: #1e293b;'>{$now}</td>
                        </tr>
                    </table>

                    <div style='background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 15px;'>
                        <strong style='color: #334155;'>Message:</strong>
                        <p style='color: #1e293b; line-height: 1.6; margin-top: 8px;'>{$safeMessage}</p>
                    </div>

                    <p style='font-size: 12px; color: #94a3b8; margin-top: 25px;'>
                        To reply to the customer, simply reply to this email or write to <a href='mailto:{$safeEmail}'>{$safeEmail}</a>.
                    </p>
                </div>
            ";

            $mail->send();
        } catch (Exception $e) {
            // Log email error, but keep message in DB
            error_log("Failed to send contact notification email: " . $e->getMessage());
        }
    }
}
