<?php
require_once dirname(__DIR__, 2) . '/config/env.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

date_default_timezone_set('Asia/Colombo');

use Dompdf\Dompdf;
use Dompdf\Options;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$autoloadPath = dirname(__DIR__, 2) . '/vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
} elseif (file_exists('./vendor/autoload.php')) {
    require_once './vendor/autoload.php';
}

class ReportController
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Download the official Dompdf Event Report
     */
    public function downloadPdf()
    {
        $eventId = $_GET['event_id'] ?? null;
        $channel = $_GET['channel'] ?? 'all';

        try {
            $pdfResult = $this->generateEventReportPdfBytes($eventId, $channel);
            $pdfBytes = $pdfResult['pdf_bytes'];
            $eventName = $pdfResult['event_name'];
            $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $eventName);
            $pdfFilename = "GoTickets_Report_{$safeName}_" . date('Y-m-d') . ".pdf";

            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . $pdfFilename . '"');
            header('Content-Length: ' . strlen($pdfBytes));
            header('Cache-Control: private, max-age=0, must-revalidate');
            header('Pragma: public');
            echo $pdfBytes;
            exit();
        } catch (Exception $e) {
            error_log("Failed to generate PDF: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to generate PDF: ' . $e->getMessage()]);
            exit();
        }
    }

    /**
     * Email the official Dompdf Event Report with PDF attachment
     */
    public function emailReport()
    {
        $data = json_decode(file_get_contents('php://input'), true);
        $recipientEmail = trim($data['recipient_email'] ?? '');
        $recipientName = trim($data['recipient_name'] ?? 'Director / Management');
        $notes = trim($data['notes'] ?? '');
        $eventId = $data['event_id'] ?? null;
        $channel = $data['channel'] ?? 'all';

        if (empty($recipientEmail) || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Please provide a valid recipient email address.']);
            return;
        }

        try {
            // 1. Generate Dompdf PDF bytes
            $pdfResult = $this->generateEventReportPdfBytes($eventId, $channel);
            $pdfBytes = $pdfResult['pdf_bytes'];
            $eventName = $pdfResult['event_name'];
            $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $eventName);
            $pdfFilename = "GoTickets_Report_{$safeName}_" . date('Y-m-d') . ".pdf";

            // 2. Setup PHPMailer
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
            } elseif ($smtpPort === 587) {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }

            $fromEmail = env('SMTP_FROM_EMAIL', 'no-reply@gotickets.lk');
            $fromName  = env('SMTP_FROM_NAME', 'GoTickets.lk Reports');
            $mail->setFrom($fromEmail, $fromName);
            $mail->addAddress($recipientEmail, $recipientName);

            // Optional CC emails
            $ccList = env('SMTP_CC_EMAILS', 'reservation@silverray.lk');
            if (!empty($ccList)) {
                $ccEmails = array_map('trim', explode(',', $ccList));
                foreach ($ccEmails as $cc) {
                    if (!empty($cc) && filter_var($cc, FILTER_VALIDATE_EMAIL) && strtolower($cc) !== strtolower($recipientEmail)) {
                        $mail->addCC($cc);
                    }
                }
            }

            // Attach Dompdf PDF
            $mail->addStringAttachment($pdfBytes, $pdfFilename, 'base64', 'application/pdf');

            // Set email subject & body
            $subject = !empty($data['subject']) ? trim($data['subject']) : "Executive Event Report: {$eventName} - GoTickets.lk";
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = $this->buildEmailBodyHtml($eventName, $pdfResult, $notes, $recipientName, $pdfFilename);
            $mail->AltBody = "Executive Event Performance & Financial Report for {$eventName}. Please review the attached PDF document for full details.";

            $mail->send();

            echo json_encode([
                'success' => true,
                'message' => "Event summary report successfully emailed to {$recipientEmail} with PDF attachment."
            ]);
        } catch (Exception $e) {
            error_log("Failed to email event report: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => "Failed to send email: " . $e->getMessage()
            ]);
        }
    }

    /**
     * Core generator: Compiles data & produces Dompdf PDF bytes
     */
    public function generateEventReportPdfBytes($eventId, $channelFilter = 'all')
    {
        $isAllEvents = ($eventId === 'all' || empty($eventId));

        // 1. Fetch Event metadata
        $eventName = 'All Events Consolidated Overview';
        $eventLocation = 'Multiple Venues';
        $eventDateStr = 'Season 2026';

        if (!$isAllEvents) {
            $stmt = $this->pdo->prepare("SELECT * FROM `event` WHERE `id` = ?");
            $stmt->execute([$eventId]);
            $eventRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($eventRecord) {
                $eventName = $eventRecord['name'] ?? 'Event';
                $eventLocation = $eventRecord['location'] ?? 'Venue N/A';
                $eventDateStr = !empty($eventRecord['date']) ? date('l, F j, Y', strtotime($eventRecord['date'])) : 'Date N/A';
            }
        }

        // 2. Fetch Ticket Types
        if ($isAllEvents) {
            $stmt = $this->pdo->query("SELECT * FROM `tickettype` ORDER BY `name` ASC");
        } else {
            $stmt = $this->pdo->prepare("SELECT * FROM `tickettype` WHERE `eventId` = ? ORDER BY `name` ASC");
            $stmt->execute([$eventId]);
        }
        $ticketTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $ticketTypeMap = [];
        foreach ($ticketTypes as $tt) {
            $ticketTypeMap[$tt['id']] = $tt;
        }

        // 3. Fetch Showtimes & Pre-aggregate ticket counts per booking
        if ($isAllEvents) {
            $stmt = $this->pdo->query("SELECT * FROM `booking_showtime`");
        } else {
            $stmt = $this->pdo->prepare("SELECT * FROM `booking_showtime` WHERE `eventId` = ?");
            $stmt->execute([$eventId]);
        }
        $showtimes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $bookingTicketCountMap = [];
        $eventBookingIds = [];
        $bookingTicketsDetailMap = [];

        foreach ($showtimes as $st) {
            $bId = $st['booking_id'];
            $eventBookingIds[$bId] = true;
            $qty = intval($st['ticket_count'] ?? 1);
            $bookingTicketCountMap[$bId] = ($bookingTicketCountMap[$bId] ?? 0) + $qty;

            $ttId = $st['tickettype_id'] ?? 0;
            $typeName = isset($ticketTypeMap[$ttId]) ? $ticketTypeMap[$ttId]['name'] : (!empty($st['ticket_type']) ? $st['ticket_type'] : "Tier #{$ttId}");
            $price = isset($ticketTypeMap[$ttId]) ? floatval($ticketTypeMap[$ttId]['price']) : 0.0;

            if (!isset($bookingTicketsDetailMap[$bId])) {
                $bookingTicketsDetailMap[$bId] = [];
            }
            $bookingTicketsDetailMap[$bId][] = [
                'type_id' => $ttId,
                'name' => $typeName,
                'count' => $qty,
                'price' => $price,
            ];
        }

        $bookingTicketsSummaryText = [];
        foreach ($bookingTicketsDetailMap as $bId => $items) {
            $parts = [];
            foreach ($items as $item) {
                $parts[] = "{$item['name']} (x{$item['count']})";
            }
            $bookingTicketsSummaryText[$bId] = implode(', ', $parts);
        }

        // 4. Fetch Bookings
        $allBookingsStmt = $this->pdo->query("SELECT * FROM `booking` ORDER BY `bookingDate` DESC");
        $rawBookings = $allBookingsStmt->fetchAll(PDO::FETCH_ASSOC);

        // 5. Fetch Salesmen
        $salesmenStmt = $this->pdo->query("SELECT * FROM `salesman`");
        $salesmen = $salesmenStmt->fetchAll(PDO::FETCH_ASSOC);
        $salesmanMap = [];
        foreach ($salesmen as $sm) {
            $salesmanMap[$sm['id']] = $sm;
        }

        // 6. Fetch Verifications
        if ($isAllEvents) {
            $vStmt = $this->pdo->query("SELECT * FROM `tickets_verifications`");
        } else {
            $vStmt = $this->pdo->prepare("SELECT * FROM `tickets_verifications` WHERE `event_id` = ?");
            $vStmt->execute([$eventId]);
        }
        $verifications = $vStmt->fetchAll(PDO::FETCH_ASSOC);
        $verifiedByTier = [];
        $verifiedByBooking = [];
        $totalVerified = 0;
        foreach ($verifications as $v) {
            $qty = intval($v['ticket_count'] ?? 0);
            $totalVerified += $qty;
            $ttId = $v['tickettype_id'] ?? 0;
            $verifiedByTier[$ttId] = ($verifiedByTier[$ttId] ?? 0) + $qty;
            $bId = $v['booking_id'] ?? 0;
            if ($bId) {
                $verifiedByBooking[$bId] = ($verifiedByBooking[$bId] ?? 0) + $qty;
            }
        }

        // 7. Filter and categorize bookings
        $confirmedBookings = [];
        $incompleteOnlineBookings = [];

        foreach ($rawBookings as $b) {
            $bId = $b['id'];
            $matchesEvent = $isAllEvents || isset($eventBookingIds[$bId]);
            if (!$matchesEvent) {
                continue;
            }

            $bookedType = strtolower($b['booked_type'] ?? 'online');
            if ($channelFilter !== 'all' && $bookedType !== strtolower($channelFilter)) {
                continue;
            }

            $status = strtolower($b['payment_status'] ?? 'pending');
            $method = strtolower($b['payment_method'] ?? '');
            $isComp = ($method === 'complimentary' || $status === 'complimentary');

            $gross = floatval($b['totalPrice'] ?? 0);
            $ticketCount = $bookingTicketCountMap[$bId] ?? 1;

            if ($isComp) {
                $category = 'complimentary';
                $collected = 0.0;
                $balance = 0.0;
            } elseif ($status === 'paid') {
                $category = 'paid';
                $collected = (!empty($b['amount_paid']) && floatval($b['amount_paid']) > 0) ? floatval($b['amount_paid']) : $gross;
                $balance = 0.0;
            } elseif ($status === 'partially_paid') {
                $category = 'partially_paid';
                $collected = floatval($b['amount_paid'] ?? 0);
                $balance = (!empty($b['balance_amount']) && floatval($b['balance_amount']) > 0)
                    ? floatval($b['balance_amount'])
                    : max(0.0, $gross - $collected);
            } elseif ($bookedType === 'manualy') {
                // Manual counter reservation (pay on arrival)
                $category = 'manual_pending';
                $collected = floatval($b['amount_paid'] ?? 0);
                $balance = max(0.0, $gross - $collected);
            } else {
                // Online checkout initiated but payment was not completed by user
                $category = 'online_incomplete';
                $collected = 0.0;
                $balance = 0.0; // Not a confirmed receivable at gate!
            }

            $smId = $b['salesman_id'] ?? null;
            $smRec = $smId && isset($salesmanMap[$smId]) ? $salesmanMap[$smId] : null;
            $salesmanDisplayName = $bookedType === 'online'
                ? 'Online Web'
                : ($smRec ? $smRec['name'] . (!empty($smRec['code']) ? " ({$smRec['code']})" : "") : (!empty($b['salesman_name']) ? $b['salesman_name'] : 'Direct Counter'));

            $ticketsSummary = $bookingTicketsSummaryText[$bId] ?? ($ticketCount > 0 ? "Standard Admission (x{$ticketCount})" : "General Admission");

            $enriched = [
                'id' => $bId,
                'customer_name' => trim(($b['first_name'] ?? '') . ' ' . ($b['last_name'] ?? '')) ?: ($b['userName'] ?? 'Guest'),
                'contact' => !empty($b['contact_number']) ? $b['contact_number'] : (!empty($b['email']) ? $b['email'] : 'N/A'),
                'booking_date' => $b['bookingDate'] ?? $b['createdAt'] ?? 'N/A',
                'category' => $category,
                'booked_type' => $bookedType,
                'gross' => $gross,
                'collected' => $collected,
                'balance' => $balance,
                'ticket_count' => $ticketCount,
                'verified_count' => $verifiedByBooking[$bId] ?? 0,
                'salesman_id' => $smId,
                'salesman_name' => $salesmanDisplayName,
                'tickets_summary' => $ticketsSummary,
                'tickets_detail' => $bookingTicketsDetailMap[$bId] ?? [],
            ];

            if ($category === 'online_incomplete') {
                $incompleteOnlineBookings[] = $enriched;
            } else {
                $confirmedBookings[] = $enriched;
            }
        }

        // 8. Financial Totals
        $totConfirmedOrders = count($confirmedBookings);
        $totOnlineConfirmed = 0;
        $totManualConfirmed = 0;
        $totConfirmedTickets = 0;
        $totCommercialTickets = 0;
        $totCompTickets = 0;
        $totGrossRevenue = 0.0;
        $totCollected = 0.0;
        $totHaveToCollect = 0.0;
        $totWaived = 0.0;

        foreach ($confirmedBookings as $cb) {
            if ($cb['booked_type'] === 'manualy') {
                $totManualConfirmed++;
            } else {
                $totOnlineConfirmed++;
            }
            $totConfirmedTickets += $cb['ticket_count'];

            if ($cb['category'] === 'complimentary') {
                $totCompTickets += $cb['ticket_count'];
                $totWaived += $cb['gross'];
            } else {
                $totCommercialTickets += $cb['ticket_count'];
                $totGrossRevenue += $cb['gross'];
                $totCollected += $cb['collected'];
                $totHaveToCollect += $cb['balance'];
            }
        }

        $totIncompleteOnlineOrders = count($incompleteOnlineBookings);
        $totIncompleteTickets = array_sum(array_column($incompleteOnlineBookings, 'ticket_count'));
        $totIncompleteGross = array_sum(array_column($incompleteOnlineBookings, 'gross'));

        $collectionRate = $totGrossRevenue > 0 ? ($totCollected / $totGrossRevenue) * 100 : 0;
        $checkInRate = $totConfirmedTickets > 0 ? ($totalVerified / $totConfirmedTickets) * 100 : 0;

        // Payment status counts & sums
        $statusBreakdown = [
            'paid' => ['count' => 0, 'tickets' => 0, 'gross' => 0.0, 'collected' => 0.0, 'balance' => 0.0],
            'partially_paid' => ['count' => 0, 'tickets' => 0, 'gross' => 0.0, 'collected' => 0.0, 'balance' => 0.0],
            'manual_pending' => ['count' => 0, 'tickets' => 0, 'gross' => 0.0, 'collected' => 0.0, 'balance' => 0.0],
            'complimentary' => ['count' => 0, 'tickets' => 0, 'gross' => 0.0, 'collected' => 0.0, 'balance' => 0.0],
        ];

        foreach ($confirmedBookings as $cb) {
            $cat = $cb['category'];
            $statusBreakdown[$cat]['count']++;
            $statusBreakdown[$cat]['tickets'] += $cb['ticket_count'];
            $statusBreakdown[$cat]['gross'] += $cb['gross'];
            $statusBreakdown[$cat]['collected'] += $cb['collected'];
            $statusBreakdown[$cat]['balance'] += $cb['balance'];
        }

        // Salesman Attribution Breakdown
        $salesAttribution = [];
        foreach ($confirmedBookings as $cb) {
            if ($cb['booked_type'] === 'online') {
                $key = 'online';
                $name = 'Online Web Portal';
                $channel = 'Online';
            } else {
                $smId = $cb['salesman_id'];
                $smRec = $smId && isset($salesmanMap[$smId]) ? $salesmanMap[$smId] : null;
                $key = $smId ? "sm_{$smId}" : 'direct_counter';
                $name = $cb['salesman_name'] ?: ($smRec ? $smRec['name'] : 'Direct Counter (No Salesman)');
                if ($smRec && !empty($smRec['code'])) {
                    $name .= " ({$smRec['code']})";
                }
                $channel = 'Manual Counter';
            }

            if (!isset($salesAttribution[$key])) {
                $salesAttribution[$key] = [
                    'name' => $name,
                    'channel' => $channel,
                    'orders' => 0,
                    'tickets' => 0,
                    'gross' => 0.0,
                    'collected' => 0.0,
                    'balance' => 0.0,
                ];
            }

            $salesAttribution[$key]['orders']++;
            $salesAttribution[$key]['tickets'] += $cb['ticket_count'];
            if ($cb['category'] !== 'complimentary') {
                $salesAttribution[$key]['gross'] += $cb['gross'];
                $salesAttribution[$key]['collected'] += $cb['collected'];
                $salesAttribution[$key]['balance'] += $cb['balance'];
            }
        }

        // Ticket Tier Breakdown
        $tierBreakdown = [];
        foreach ($ticketTypes as $tt) {
            $tierBreakdown[$tt['id']] = [
                'name' => $tt['name'],
                'price' => floatval($tt['price']),
                'sold' => 0,
                'comp' => 0,
                'verified' => $verifiedByTier[$tt['id']] ?? 0,
                'revenue' => 0.0,
            ];
        }

        // Map confirmed bookings to ticket types
        $confirmedBookingIdMap = [];
        foreach ($confirmedBookings as $cb) {
            $confirmedBookingIdMap[$cb['id']] = $cb;
        }

        foreach ($showtimes as $st) {
            $bId = $st['booking_id'];
            if (!isset($confirmedBookingIdMap[$bId])) {
                continue; // skip incomplete online attempts
            }
            $parent = $confirmedBookingIdMap[$bId];
            $ttId = $st['tickettype_id'];
            $qty = intval($st['ticket_count'] ?? 1);

            if (!isset($tierBreakdown[$ttId])) {
                $tierBreakdown[$ttId] = [
                    'name' => "Tier #{$ttId}",
                    'price' => 0.0,
                    'sold' => 0,
                    'comp' => 0,
                    'verified' => $verifiedByTier[$ttId] ?? 0,
                    'revenue' => 0.0,
                ];
            }

            if ($parent['category'] === 'complimentary') {
                $tierBreakdown[$ttId]['comp'] += $qty;
            } else {
                $tierBreakdown[$ttId]['sold'] += $qty;
                $tierBreakdown[$ttId]['revenue'] += ($qty * $tierBreakdown[$ttId]['price']);
            }
        }

        // 9. Build Dompdf HTML Document
        $html = $this->buildReportDompdfHtml([
            'eventName' => $eventName,
            'eventLocation' => $eventLocation,
            'eventDateStr' => $eventDateStr,
            'channelFilter' => $channelFilter,
            'generatedAt' => date('F j, Y, g:i A'),
            'totals' => [
                'confirmedOrders' => $totConfirmedOrders,
                'onlineConfirmed' => $totOnlineConfirmed,
                'manualConfirmed' => $totManualConfirmed,
                'confirmedTickets' => $totConfirmedTickets,
                'commercialTickets' => $totCommercialTickets,
                'compTickets' => $totCompTickets,
                'grossRevenue' => $totGrossRevenue,
                'collected' => $totCollected,
                'haveToCollect' => $totHaveToCollect,
                'waived' => $totWaived,
                'collectionRate' => $collectionRate,
                'totalVerified' => $totalVerified,
                'checkInRate' => $checkInRate,
                'incompleteOrders' => $totIncompleteOnlineOrders,
                'incompleteTickets' => $totIncompleteTickets,
                'incompleteGross' => $totIncompleteGross,
            ],
            'statusBreakdown' => $statusBreakdown,
            'salesAttribution' => $salesAttribution,
            'tierBreakdown' => $tierBreakdown,
            'confirmedBookings' => $confirmedBookings,
            'incompleteOnlineBookings' => $incompleteOnlineBookings,
        ]);

        // 10. Render with Dompdf
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'Helvetica');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        // Add dynamic page numbers across all pages!
        $canvas = $dompdf->getCanvas();
        $fontMetrics = $dompdf->getFontMetrics();
        $font = $fontMetrics->get_font('Helvetica', 'normal');
        $canvas->page_text(28, 818, "Official Event Performance & Financial Reconciliation Document • GoTickets.lk", $font, 7.5, [148/255, 163/255, 184/255]);
        $canvas->page_text(515, 818, "Page {PAGE_NUM} of {PAGE_COUNT}", $font, 7.5, [148/255, 163/255, 184/255]);

        $pdfBytes = $dompdf->output();

        return [
            'pdf_bytes' => $pdfBytes,
            'event_name' => $eventName,
            'event_location' => $eventLocation,
            'event_date' => $eventDateStr,
            'channel_filter' => $channelFilter,
            'generated_at' => date('F j, Y, g:i A'),
            'totals' => [
                'confirmedOrders' => $totConfirmedOrders,
                'onlineConfirmed' => $totOnlineConfirmed,
                'manualConfirmed' => $totManualConfirmed,
                'confirmedTickets' => $totConfirmedTickets,
                'commercialTickets' => $totCommercialTickets,
                'compTickets' => $totCompTickets,
                'grossRevenue' => $totGrossRevenue,
                'collected' => $totCollected,
                'haveToCollect' => $totHaveToCollect,
                'waived' => $totWaived,
                'collectionRate' => $collectionRate,
                'totalVerified' => $totalVerified,
                'checkInRate' => $checkInRate,
                'incompleteOrders' => $totIncompleteOnlineOrders,
                'incompleteTickets' => $totIncompleteTickets,
                'incompleteGross' => $totIncompleteGross,
            ],
            'statusBreakdown' => $statusBreakdown,
            'salesAttribution' => $salesAttribution,
            'tierBreakdown' => $tierBreakdown,
        ];
    }

    /**
     * Clean, CSS2.1-compliant HTML template designed specifically for Dompdf
     */
    private function buildReportDompdfHtml($data)
    {
        $eventName = htmlspecialchars($data['eventName']);
        $eventLocation = htmlspecialchars($data['eventLocation']);
        $eventDateStr = htmlspecialchars($data['eventDateStr']);
        $generatedAt = htmlspecialchars($data['generatedAt']);
        $scope = ucfirst(htmlspecialchars($data['channelFilter']));

        $t = $data['totals'];
        $sb = $data['statusBreakdown'];
        $sa = $data['salesAttribution'];
        $tb = $data['tierBreakdown'];
        $confirmedBookings = $data['confirmedBookings'] ?? [];
        $incompleteOnlineBookings = $data['incompleteOnlineBookings'] ?? [];

        ob_start();
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Event Performance & Financial Report - <?php echo $eventName; ?></title>
            <style>
                @page {
                    margin: 10mm 10mm 14mm 10mm;
                    size: a4 portrait;
                }
                body {
                    font-family: Helvetica, Arial, sans-serif;
                    font-size: 11px;
                    color: #1e293b;
                    line-height: 1.35;
                    margin: 0;
                    padding: 0;
                }
                .header-table {
                    width: 100%;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 8px;
                    margin-bottom: 12px;
                }
                .logo-text {
                    font-size: 20px;
                    font-weight: bold;
                    color: #2563eb;
                    letter-spacing: -0.5px;
                }
                .badge {
                    display: inline-block;
                    background-color: #dbeafe;
                    color: #1e40af;
                    font-size: 9px;
                    font-weight: bold;
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-transform: uppercase;
                }
                .badge-blue { background-color: #dbeafe; color: #1e40af; }
                .badge-gray { background-color: #f3f4f6; color: #374151; }
                .badge-status {
                    display: inline-block;
                    padding: 1.5px 5px;
                    border-radius: 3px;
                    font-size: 7.5px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .status-paid { background-color: #dcfce7; color: #15803d; }
                .status-partial { background-color: #dbeafe; color: #1e40af; }
                .status-gate { background-color: #fef3c7; color: #b45309; }
                .status-comp { background-color: #f3e8ff; color: #7e22ce; }
                .status-incomplete { background-color: #f3f4f6; color: #6b7280; }

                .doc-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #0f172a;
                    margin: 3px 0 2px 0;
                }
                .meta-text {
                    font-size: 10px;
                    color: #64748b;
                }
                
                /* 6-box KPI grid using table */
                .kpi-table {
                    width: 100%;
                    margin-bottom: 14px;
                    border-spacing: 6px;
                }
                .kpi-card {
                    background-color: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 8px;
                    vertical-align: top;
                }
                .kpi-card-green {
                    background-color: #f0fdf4;
                    border: 1px solid #bbf7d0;
                }
                .kpi-card-amber {
                    background-color: #fffbeb;
                    border: 1px solid #fde68a;
                }
                .kpi-title {
                    font-size: 9px;
                    font-weight: bold;
                    text-transform: uppercase;
                    color: #64748b;
                    margin-bottom: 2px;
                }
                .kpi-val {
                    font-size: 14px;
                    font-weight: bold;
                    color: #0f172a;
                }
                .kpi-sub {
                    font-size: 9px;
                    color: #64748b;
                    margin-top: 3px;
                }

                .section-title {
                    font-size: 11.5px;
                    font-weight: bold;
                    color: #1e293b;
                    margin: 12px 0 6px 0;
                    padding-bottom: 3px;
                    border-bottom: 1px solid #e2e8f0;
                    page-break-after: avoid;
                }

                /* Standard Data Table */
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 12px;
                    font-size: 9.5px;
                }
                .data-table thead {
                    display: table-header-group;
                }
                .data-table tr {
                    page-break-inside: avoid;
                }
                .data-table th {
                    background-color: #f1f5f9;
                    color: #334155;
                    font-weight: bold;
                    text-align: left;
                    padding: 5px 6px;
                    border-top: 1px solid #cbd5e1;
                    border-bottom: 1px solid #cbd5e1;
                }
                .data-table td {
                    padding: 5px 6px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .data-table tr.total-row td {
                    background-color: #f8fafc;
                    font-weight: bold;
                    border-top: 1.5px solid #94a3b8;
                    border-bottom: 1.5px solid #94a3b8;
                }
                .data-table tr.abandoned-row td {
                    background-color: #fbfbfb;
                    color: #94a3b8;
                    font-style: italic;
                }

                /* Ledger Table Specifically for Page 2 */
                .ledger-table {
                    font-size: 8px;
                }
                .ledger-table th {
                    background-color: #0f172a;
                    color: #ffffff;
                    font-size: 8px;
                    padding: 4px 4px;
                    border: 1px solid #1e293b;
                }
                .ledger-table td {
                    padding: 3.5px 4px;
                    font-size: 8px;
                    border-bottom: 1px solid #e2e8f0;
                }

                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .text-green { color: #15803d; font-weight: bold; }
                .text-amber { color: #b45309; font-weight: bold; }
                .text-blue { color: #2563eb; font-weight: bold; }

                .notice-box {
                    background-color: #f8fafc;
                    border-left: 3px solid #2563eb;
                    padding: 6px 8px;
                    font-size: 9px;
                    color: #475569;
                    margin-bottom: 10px;
                }

                .footer-table {
                    width: 100%;
                    margin-top: 15px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 6px;
                    font-size: 8px;
                    color: #94a3b8;
                }
            </style>
        </head>
        <body>
            <!-- Header Table -->
            <table class="header-table">
                <tr>
                    <td style="width: 65%;">
                        <span class="logo-text">GoTickets.lk</span>
                        &nbsp;<span class="badge">Official Financial Audit</span>
                        <div class="doc-title"><?php echo $eventName; ?></div>
                        <div class="meta-text">
                            <strong>Venue:</strong> <?php echo $eventLocation; ?> &nbsp;|&nbsp;
                            <strong>Event Date:</strong> <?php echo $eventDateStr; ?>
                        </div>
                    </td>
                    <td style="width: 35%; text-align: right; vertical-align: top;" class="meta-text">
                        <div><strong>Generated:</strong> <?php echo $generatedAt; ?></div>
                        <div><strong>Scope:</strong> <?php echo $scope; ?> Channels</div>
                        <div><strong>Confirmed Orders:</strong> <?php echo $t['confirmedOrders']; ?></div>
                    </td>
                </tr>
            </table>

            <!-- 6 KPI Summary Cards Grid -->
            <table class="kpi-table">
                <tr>
                    <td class="kpi-card" style="width: 16.6%;">
                        <div class="kpi-title">Confirmed Orders</div>
                        <div class="kpi-val"><?php echo number_format($t['confirmedOrders']); ?></div>
                        <div class="kpi-sub">Online: <?php echo $t['onlineConfirmed']; ?> | Counter: <?php echo $t['manualConfirmed']; ?></div>
                    </td>
                    <td class="kpi-card" style="width: 16.6%;">
                        <div class="kpi-title">Tickets Issued</div>
                        <div class="kpi-val"><?php echo number_format($t['confirmedTickets']); ?></div>
                        <div class="kpi-sub">Paid: <?php echo $t['commercialTickets']; ?> | Free: <?php echo $t['compTickets']; ?></div>
                    </td>
                    <td class="kpi-card" style="width: 16.6%;">
                        <div class="kpi-title">Confirmed Gross</div>
                        <div class="kpi-val" style="color: #2563eb;">LKR <?php echo number_format($t['grossRevenue'], 2); ?></div>
                        <div class="kpi-sub">Valid order value</div>
                    </td>
                    <td class="kpi-card kpi-card-green" style="width: 16.6%;">
                        <div class="kpi-title" style="color: #15803d;">Collected</div>
                        <div class="kpi-val text-green">LKR <?php echo number_format($t['collected'], 2); ?></div>
                        <div class="kpi-sub"><?php echo number_format($t['collectionRate'], 1); ?>% Realized</div>
                    </td>
                    <td class="kpi-card kpi-card-amber" style="width: 16.6%;">
                        <div class="kpi-title" style="color: #b45309;">To Collect (Due)</div>
                        <div class="kpi-val text-amber">LKR <?php echo number_format($t['haveToCollect'], 2); ?></div>
                        <div class="kpi-sub">Gate Receivables</div>
                    </td>
                    <td class="kpi-card" style="width: 16.6%;">
                        <div class="kpi-title">Gate Check-in</div>
                        <div class="kpi-val"><?php echo number_format($t['totalVerified']); ?> <span style="font-size: 10px; font-weight: normal; color: #64748b;">/ <?php echo $t['confirmedTickets']; ?></span></div>
                        <div class="kpi-sub"><?php echo number_format($t['checkInRate'], 1); ?>% Attended</div>
                    </td>
                </tr>
            </table>

            <!-- Section 1: Payment Status & Reconciliation Breakdown -->
            <div class="section-title">1. Payment Status & Collections Breakdown</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 28%;">Payment Category</th>
                        <th class="text-center" style="width: 10%;">Orders</th>
                        <th class="text-center" style="width: 10%;">Tickets</th>
                        <th class="text-right" style="width: 18%;">Order Value (LKR)</th>
                        <th class="text-right" style="width: 17%;">Collected (LKR)</th>
                        <th class="text-right" style="width: 17%;">Have To Collect (Due)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Paid in Full (100% Cleared)</strong></td>
                        <td class="text-center"><?php echo $sb['paid']['count']; ?></td>
                        <td class="text-center"><?php echo $sb['paid']['tickets']; ?></td>
                        <td class="text-right"><?php echo number_format($sb['paid']['gross'], 2); ?></td>
                        <td class="text-right text-green"><?php echo number_format($sb['paid']['collected'], 2); ?></td>
                        <td class="text-right">0.00</td>
                    </tr>
                    <tr>
                        <td><strong>Partially Paid (Advance Deposit)</strong></td>
                        <td class="text-center"><?php echo $sb['partially_paid']['count']; ?></td>
                        <td class="text-center"><?php echo $sb['partially_paid']['tickets']; ?></td>
                        <td class="text-right"><?php echo number_format($sb['partially_paid']['gross'], 2); ?></td>
                        <td class="text-right text-green"><?php echo number_format($sb['partially_paid']['collected'], 2); ?></td>
                        <td class="text-right text-amber"><?php echo number_format($sb['partially_paid']['balance'], 2); ?></td>
                    </tr>
                    <tr>
                        <td><strong>Manual Reserved (Pay at Gate)</strong></td>
                        <td class="text-center"><?php echo $sb['manual_pending']['count']; ?></td>
                        <td class="text-center"><?php echo $sb['manual_pending']['tickets']; ?></td>
                        <td class="text-right"><?php echo number_format($sb['manual_pending']['gross'], 2); ?></td>
                        <td class="text-right">0.00</td>
                        <td class="text-right text-amber"><?php echo number_format($sb['manual_pending']['balance'], 2); ?></td>
                    </tr>
                    <tr>
                        <td><strong>Complimentary Free Passes</strong></td>
                        <td class="text-center"><?php echo $sb['complimentary']['count']; ?></td>
                        <td class="text-center"><?php echo $sb['complimentary']['tickets']; ?></td>
                        <td class="text-right"><?php echo number_format($sb['complimentary']['gross'], 2); ?></td>
                        <td class="text-right">0.00</td>
                        <td class="text-right">0.00</td>
                    </tr>
                    <!-- Subtotal Confirmed -->
                    <tr class="total-row">
                        <td>TOTAL CONFIRMED ADMISSIONS</td>
                        <td class="text-center"><?php echo $t['confirmedOrders']; ?></td>
                        <td class="text-center"><?php echo $t['confirmedTickets']; ?></td>
                        <td class="text-right">LKR <?php echo number_format($t['grossRevenue'] + $t['waived'], 2); ?></td>
                        <td class="text-right text-green">LKR <?php echo number_format($t['collected'], 2); ?></td>
                        <td class="text-right text-amber">LKR <?php echo number_format($t['haveToCollect'], 2); ?></td>
                    </tr>
                    <!-- Incomplete Online Checkouts -->
                    <?php if ($t['incompleteOrders'] > 0): ?>
                    <tr class="abandoned-row">
                        <td>Incomplete Online Checkouts (Payment Not Done)*</td>
                        <td class="text-center"><?php echo $t['incompleteOrders']; ?></td>
                        <td class="text-center"><?php echo $t['incompleteTickets']; ?> (Attempted)</td>
                        <td class="text-right"><?php echo number_format($t['incompleteGross'], 2); ?></td>
                        <td class="text-right">0.00</td>
                        <td class="text-right">0.00 (Unconfirmed)</td>
                    </tr>
                    <?php endif; ?>
                </tbody>
            </table>
            <div class="notice-box">
                * <strong>Accounting Note:</strong> Incomplete online checkouts represent abandoned web shopping carts where payment was not completed by the user. Tickets were not issued and these are not counted in active gate receivables.
            </div>

            <!-- Section 2: Sales Representative & Channel Attribution -->
            <div class="section-title">2. Sales Representative Attribution & Channel Performance</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 32%;">Sales Representative / Channel</th>
                        <th style="width: 16%;">Channel</th>
                        <th class="text-center" style="width: 10%;">Orders</th>
                        <th class="text-center" style="width: 10%;">Tickets</th>
                        <th class="text-right" style="width: 16%;">Confirmed Gross</th>
                        <th class="text-right" style="width: 16%;">Collected</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($sa)): ?>
                    <tr>
                        <td colspan="6" class="text-center" style="padding: 10px; color: #94a3b8;">No confirmed sales records found.</td>
                    </tr>
                    <?php else: ?>
                        <?php foreach ($sa as $agent): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($agent['name']); ?></strong></td>
                            <td><?php echo htmlspecialchars($agent['channel']); ?></td>
                            <td class="text-center"><?php echo $agent['orders']; ?></td>
                            <td class="text-center"><?php echo $agent['tickets']; ?></td>
                            <td class="text-right">LKR <?php echo number_format($agent['gross'], 2); ?></td>
                            <td class="text-right text-green">LKR <?php echo number_format($agent['collected'], 2); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <tr class="total-row">
                            <td colspan="2">TOTAL CONFIRMED ATTRIBUTION</td>
                            <td class="text-center"><?php echo array_sum(array_column($sa, 'orders')); ?></td>
                            <td class="text-center"><?php echo array_sum(array_column($sa, 'tickets')); ?></td>
                            <td class="text-right">LKR <?php echo number_format(array_sum(array_column($sa, 'gross')), 2); ?></td>
                            <td class="text-right text-green">LKR <?php echo number_format(array_sum(array_column($sa, 'collected')), 2); ?></td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <!-- Section 3: Ticket Tier Breakdown -->
            <div class="section-title">3. Ticket Tier Sales & Verification Progress</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">Ticket Tier</th>
                        <th class="text-right" style="width: 12%;">Price (LKR)</th>
                        <th class="text-center" style="width: 10%;">Sold (Paid)</th>
                        <th class="text-center" style="width: 10%;">Free Passes</th>
                        <th class="text-center" style="width: 11%;">Total Issued</th>
                        <th class="text-center" style="width: 12%;">Gate Scanned</th>
                        <th class="text-right" style="width: 20%;">Total Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($tb)): ?>
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 10px; color: #94a3b8;">No ticket tiers found.</td>
                    </tr>
                    <?php else: ?>
                        <?php foreach ($tb as $tier): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($tier['name']); ?></strong></td>
                            <td class="text-right"><?php echo number_format($tier['price'], 2); ?></td>
                            <td class="text-center"><?php echo number_format($tier['sold']); ?></td>
                            <td class="text-center"><?php echo number_format($tier['comp']); ?></td>
                            <td class="text-center"><strong><?php echo number_format($tier['sold'] + $tier['comp']); ?></strong></td>
                            <td class="text-center text-green"><?php echo number_format($tier['verified']); ?></td>
                            <td class="text-right">LKR <?php echo number_format($tier['revenue'], 2); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <tr class="total-row">
                            <td colspan="2">TOTAL TIER ADMISSIONS</td>
                            <td class="text-center"><?php echo number_format(array_sum(array_column($tb, 'sold'))); ?></td>
                            <td class="text-center"><?php echo number_format(array_sum(array_column($tb, 'comp'))); ?></td>
                            <td class="text-center"><?php echo number_format($t['confirmedTickets']); ?></td>
                            <td class="text-center text-green"><?php echo number_format($t['totalVerified']); ?></td>
                            <td class="text-right">LKR <?php echo number_format(array_sum(array_column($tb, 'revenue')), 2); ?></td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <!-- Page 1 Document Footer -->
            <table class="footer-table">
                <tr>
                    <td style="width: 60%;">
                        Official Event Performance & Financial Reconciliation Document &bull; GoTickets.lk
                    </td>
                    <td style="width: 40%; text-align: right;">
                        CONFIDENTIAL &bull; Page 1: Executive Audit Summary
                    </td>
                </tr>
            </table>

            <!-- ======================================================== -->
            <!-- PAGE 2+: INDIVIDUAL BOOKING LEDGER & TICKET BREAKDOWN   -->
            <!-- ======================================================== -->
            <div style="page-break-before: always;"></div>

            <!-- Page 2 Header Table -->
            <table class="header-table">
                <tr>
                    <td style="width: 65%;">
                        <span class="logo-text">GoTickets<span style="color: #2563eb;">.</span><span style="color: #f97316;">lk</span></span>
                        &nbsp;<span class="badge" style="background-color: #f3e8ff; color: #7e22ce;">INDIVIDUAL BOOKING AUDIT</span>
                        <div class="doc-title" style="font-size: 14px; margin-top: 3px;">
                            Detailed Booking Ledger &bull; <?php echo $eventName; ?>
                        </div>
                        <div class="meta-text">
                            <strong>Venue:</strong> <?php echo $eventLocation; ?> &nbsp;|&nbsp;
                            <strong>Date:</strong> <?php echo $eventDateStr; ?>
                        </div>
                    </td>
                    <td style="width: 35%; text-align: right; vertical-align: top;" class="meta-text">
                        <div><strong>Scope:</strong> <?php echo $scope; ?> Channels</div>
                        <div><strong>Confirmed Bookings:</strong> <?php echo count($confirmedBookings); ?> orders</div>
                        <div><strong>Total Tickets:</strong> <?php echo number_format($t['confirmedTickets']); ?> admissions</div>
                        <div><strong>Generated:</strong> <?php echo $generatedAt; ?></div>
                    </td>
                </tr>
            </table>

            <div class="section-title">4. Individual Confirmed Booking Ledger (Booking-Wise Ticket Details)</div>
            
            <table class="data-table ledger-table">
                <thead>
                    <tr>
                        <th style="width: 5%;">#ID</th>
                        <th style="width: 9%;">Date</th>
                        <th style="width: 17%;">Customer Details</th>
                        <th style="width: 12%;">Channel / Issuer</th>
                        <th style="width: 23%;">Ticket Info (Tiers &amp; Qty)</th>
                        <th class="text-center" style="width: 7%;">Gate</th>
                        <th class="text-center" style="width: 8%;">Status</th>
                        <th class="text-right" style="width: 7%;">Gross</th>
                        <th class="text-right" style="width: 6%;">Paid</th>
                        <th class="text-right" style="width: 6%;">Due</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($confirmedBookings)): ?>
                    <tr>
                        <td colspan="10" class="text-center" style="padding: 12px; color: #94a3b8;">
                            No confirmed bookings found for the selected scope.
                        </td>
                    </tr>
                    <?php else: ?>
                        <?php foreach ($confirmedBookings as $b): 
                            $statusStyle = 'status-paid';
                            $statusText = 'PAID';
                            if ($b['category'] === 'complimentary') {
                                $statusStyle = 'status-comp';
                                $statusText = 'COMP';
                            } elseif ($b['category'] === 'partially_paid') {
                                $statusStyle = 'status-partial';
                                $statusText = 'PARTIAL';
                            } elseif ($b['category'] === 'manual_pending') {
                                $statusStyle = 'status-gate';
                                $statusText = 'GATE PAY';
                            }
                            $dateFormatted = (!empty($b['booking_date']) && $b['booking_date'] !== 'N/A')
                                ? date('M d, Y', strtotime($b['booking_date']))
                                : '-';
                            $scannedAll = ($b['verified_count'] >= $b['ticket_count'] && $b['ticket_count'] > 0);
                        ?>
                        <tr>
                            <td><strong>#<?php echo $b['id']; ?></strong></td>
                            <td style="color: #64748b; font-size: 8px;"><?php echo $dateFormatted; ?></td>
                            <td>
                                <strong><?php echo htmlspecialchars($b['customer_name']); ?></strong>
                                <div style="font-size: 7.5px; color: #64748b;"><?php echo htmlspecialchars($b['contact']); ?></div>
                            </td>
                            <td>
                                <span class="badge <?php echo $b['booked_type'] === 'online' ? 'badge-blue' : 'badge-gray'; ?>" style="font-size: 7.5px; padding: 1px 4px;">
                                    <?php echo ucfirst($b['booked_type']); ?>
                                </span>
                                <div style="font-size: 7.5px; color: #475569; margin-top: 1px;"><?php echo htmlspecialchars($b['salesman_name']); ?></div>
                            </td>
                            <td>
                                <div style="font-weight: bold; color: #0f172a; font-size: 8.5px;">
                                    <?php echo htmlspecialchars($b['tickets_summary']); ?>
                                </div>
                                <div style="font-size: 7.5px; color: #64748b;">
                                    Total: <?php echo $b['ticket_count']; ?> ticket<?php echo $b['ticket_count'] > 1 ? 's' : ''; ?>
                                </div>
                            </td>
                            <td class="text-center" style="font-size: 8px; <?php echo $scannedAll ? 'color: #15803d; font-weight: bold;' : ($b['verified_count'] > 0 ? 'color: #2563eb; font-weight: bold;' : 'color: #94a3b8;'); ?>">
                                <?php echo $b['verified_count']; ?> / <?php echo $b['ticket_count']; ?>
                            </td>
                            <td class="text-center">
                                <span class="badge-status <?php echo $statusStyle; ?>"><?php echo $statusText; ?></span>
                            </td>
                            <td class="text-right"><?php echo number_format($b['gross'], 2); ?></td>
                            <td class="text-right text-green"><?php echo number_format($b['collected'], 2); ?></td>
                            <td class="text-right <?php echo $b['balance'] > 0 ? 'text-amber' : ''; ?>">
                                <?php echo $b['balance'] > 0 ? number_format($b['balance'], 2) : '-'; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <tr class="total-row">
                            <td colspan="4">TOTAL CONFIRMED (<?php echo count($confirmedBookings); ?> BOOKINGS)</td>
                            <td><strong><?php echo number_format($t['confirmedTickets']); ?> Tickets Issued</strong></td>
                            <td class="text-center text-green"><?php echo number_format($t['totalVerified']); ?></td>
                            <td class="text-center">-</td>
                            <td class="text-right">LKR <?php echo number_format($t['grossRevenue'], 2); ?></td>
                            <td class="text-right text-green">LKR <?php echo number_format($t['collected'], 2); ?></td>
                            <td class="text-right <?php echo $t['haveToCollect'] > 0 ? 'text-amber' : ''; ?>">
                                LKR <?php echo number_format($t['haveToCollect'], 2); ?>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <?php if (!empty($incompleteOnlineBookings)): ?>
            <!-- ======================================================== -->
            <!-- SECTION 5: INCOMPLETE / ABANDONED ONLINE CHECKOUTS AUDIT -->
            <!-- ======================================================== -->
            <div style="page-break-before: always;"></div>

            <!-- Section 5 Header Table -->
            <table class="header-table">
                <tr>
                    <td style="width: 65%;">
                        <span class="logo-text">GoTickets<span style="color: #2563eb;">.</span><span style="color: #f97316;">lk</span></span>
                        &nbsp;<span class="badge" style="background-color: #f1f5f9; color: #475569;">UNCONFIRMED CHECKOUTS AUDIT</span>
                        <div class="doc-title" style="font-size: 14px; margin-top: 3px;">
                            Abandoned Online Checkouts &bull; <?php echo $eventName; ?>
                        </div>
                        <div class="meta-text">
                            <strong>Audit Scope:</strong> Web checkout sessions where customer initiated booking but payment was not completed.
                        </div>
                    </td>
                    <td style="width: 35%; text-align: right; vertical-align: top;" class="meta-text">
                        <div><strong>Total Incomplete Sessions:</strong> <?php echo count($incompleteOnlineBookings); ?> attempts</div>
                        <div><strong>Attempted Tickets:</strong> <?php echo number_format($t['incompleteTickets']); ?> tickets</div>
                        <div><strong>Attempted Gross:</strong> LKR <?php echo number_format($t['incompleteGross'], 2); ?></div>
                        <div><strong>Status:</strong> Unconfirmed &bull; No Tickets Issued</div>
                    </td>
                </tr>
            </table>

            <div class="section-title">5. Incomplete / Abandoned Online Checkouts (Payment Not Made &bull; Unconfirmed)</div>
            
            <table class="data-table ledger-table">
                <thead>
                    <tr style="background-color: #f8fafc;">
                        <th style="width: 6%;">#ID</th>
                        <th style="width: 11%;">Attempt Date</th>
                        <th style="width: 24%;">Customer Details</th>
                        <th style="width: 33%;">Attempted Ticket Types</th>
                        <th class="text-center" style="width: 8%;">Tickets</th>
                        <th class="text-right" style="width: 18%;">Attempted Gross</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($incompleteOnlineBookings as $ib): ?>
                    <tr class="abandoned-row">
                        <td>#<?php echo $ib['id']; ?></td>
                        <td><?php echo (!empty($ib['booking_date']) && $ib['booking_date'] !== 'N/A') ? date('M d, Y', strtotime($ib['booking_date'])) : '-'; ?></td>
                        <td><?php echo htmlspecialchars($ib['customer_name']); ?> (<?php echo htmlspecialchars($ib['contact']); ?>)</td>
                        <td><?php echo htmlspecialchars($ib['tickets_summary']); ?></td>
                        <td class="text-center"><?php echo $ib['ticket_count']; ?></td>
                        <td class="text-right">LKR <?php echo number_format($ib['gross'], 2); ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <tr class="total-row">
                        <td colspan="4">TOTAL UNCONFIRMED ATTEMPTS (<?php echo count($incompleteOnlineBookings); ?> SESSIONS)</td>
                        <td class="text-center"><?php echo number_format($t['incompleteTickets']); ?></td>
                        <td class="text-right">LKR <?php echo number_format($t['incompleteGross'], 2); ?></td>
                    </tr>
                </tbody>
            </table>

            <!-- Accounting note for Section 5 -->
            <div class="notice-box" style="margin-top: 6px;">
                <strong>Accounting & Admissions Note:</strong> The above incomplete online checkouts represent abandoned shopping carts. Payment was NOT settled by the customer, tickets and admission QR codes were NOT issued, and these amounts are NOT counted in confirmed event revenue or gate receivables.
            </div>
            <?php endif; ?>

            <!-- Document Footer -->
            <table class="footer-table">
                <tr>
                    <td style="width: 60%;">
                        Official Event Performance & Financial Reconciliation Document &bull; GoTickets.lk
                    </td>
                    <td style="width: 40%; text-align: right;">
                        CONFIDENTIAL &bull; For Authorized Organizers & Management
                    </td>
                </tr>
            </table>
        </body>
        </html>
        <?php
        return ob_get_clean();
    }

    /**
     * Professional HTML email briefing for Directors & Management
     */
    private function buildEmailBodyHtml($eventName, $pdfResult, $notes, $recipientName, $pdfFilename = '')
    {
        $t = $pdfResult['totals'];
        $sb = $pdfResult['statusBreakdown'] ?? [];
        $sa = $pdfResult['salesAttribution'] ?? [];
        $location = htmlspecialchars($pdfResult['event_location'] ?? 'Venue N/A');
        $dateStr = htmlspecialchars($pdfResult['event_date'] ?? 'Date N/A');
        $channelScope = ucfirst(htmlspecialchars($pdfResult['channel_filter'] ?? 'all'));
        $generatedAt = htmlspecialchars($pdfResult['generated_at'] ?? date('F j, Y, g:i A'));

        if (empty($pdfFilename)) {
            $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $eventName);
            $pdfFilename = "GoTickets_Report_{$safeName}_" . date('Y-m-d') . ".pdf";
        }

        $notesBlock = !empty($notes) ? "
            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 6px; margin: 18px 0; border: 1px solid #e2e8f0; border-left-width: 4px;'>
                <tr>
                    <td style='padding: 14px 18px;'>
                        <div style='font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;'>Message from Sender:</div>
                        <div style='font-size: 13px; line-height: 1.6; color: #1e293b;'>" . nl2br(htmlspecialchars($notes)) . "</div>
                    </td>
                </tr>
            </table>" : "";

        // Status Breakdown Rows
        $sbRowsHtml = '';
        if (!empty($sb)) {
            $statusLabels = [
                'paid' => ['name' => 'Paid in Full', 'color' => '#16a34a'],
                'partially_paid' => ['name' => 'Partially Paid (Advance)', 'color' => '#2563eb'],
                'manual_pending' => ['name' => 'Manual Reserved (Gate Due)', 'color' => '#d97706'],
                'complimentary' => ['name' => 'Complimentary Passes (Free)', 'color' => '#7c3aed'],
            ];

            foreach ($statusLabels as $sKey => $sMeta) {
                if (isset($sb[$sKey])) {
                    $row = $sb[$sKey];
                    $sbRowsHtml .= "
                    <tr>
                        <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;'>
                            <strong style='color: {$sMeta['color']};'>&bull;</strong> <strong>{$sMeta['name']}</strong>
                        </td>
                        <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #334155;'>" . number_format($row['tickets']) . "</td>
                        <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; color: #334155;'>LKR " . number_format($row['gross'], 2) . "</td>
                        <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 600; color: #16a34a;'>LKR " . number_format($row['collected'], 2) . "</td>
                        <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 600; color: " . ($row['balance'] > 0 ? '#d97706' : '#64748b') . ";'>LKR " . number_format($row['balance'], 2) . "</td>
                    </tr>";
                }
            }

            // Incomplete Online Checkouts
            if (isset($sb['online_incomplete']) && $sb['online_incomplete']['count'] > 0) {
                $row = $sb['online_incomplete'];
                $sbRowsHtml .= "
                <tr style='background-color: #fafaf9;'>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;'>
                        <strong style='color: #94a3b8;'>&bull;</strong> Incomplete Web Checkouts <span style='font-size: 10px;'>(Abandoned)</span>
                    </td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; color: #94a3b8;'>" . number_format($row['tickets']) . "</td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #94a3b8;'>LKR " . number_format($row['gross'], 2) . "</td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #94a3b8;'>LKR 0.00</td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-style: italic; color: #94a3b8;'>Unconfirmed</td>
                </tr>";
            }
        }

        // Sales Attribution Rows
        $saRowsHtml = '';
        if (!empty($sa)) {
            foreach ($sa as $agent) {
                $channelBadge = ($agent['channel'] === 'Online')
                    ? "<span style='background-color: #dbeafe; color: #1e40af; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: bold;'>ONLINE</span>"
                    : "<span style='background-color: #f3f4f6; color: #374151; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: bold;'>COUNTER</span>";

                $saRowsHtml .= "
                <tr>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;'>
                        <strong>" . htmlspecialchars($agent['name']) . "</strong>
                    </td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;'>{$channelBadge}</td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #334155;'>" . number_format($agent['orders']) . "</td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #334155;'>" . number_format($agent['tickets']) . "</td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 600; color: #16a34a;'>LKR " . number_format($agent['collected'], 2) . "</td>
                    <td style='padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 600; color: " . ($agent['balance'] > 0 ? '#d97706' : '#64748b') . ";'>LKR " . number_format($agent['balance'], 2) . "</td>
                </tr>";
            }
        }

        return "
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Event Performance & Financial Briefing - {$eventName}</title>
</head>
<body style='margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
    <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 32px 12px;'>
        <tr>
            <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 650px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;'>
                    
                    <!-- Header Obsidian Banner -->
                    <tr>
                        <td style='background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px 24px 32px;'>
                            <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                                <tr>
                                    <td>
                                        <div style='font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;'>
                                            GoTickets<span style='color: #2563eb;'>.</span><span style='color: #f97316;'>lk</span>
                                        </div>
                                        <div style='color: #94a3b8; font-size: 11px; margin-top: 3px; letter-spacing: 0.6px; text-transform: uppercase;'>
                                            Executive Financial &amp; Attendance Briefing
                                        </div>
                                    </td>
                                    <td align='right' style='vertical-align: top;'>
                                        <div style='display: inline-block; background-color: rgba(37,99,235,0.25); color: #93c5fd; border: 1px solid rgba(147,197,253,0.3); font-size: 9px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;'>
                                            CONFIDENTIAL AUDIT
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Event Title & Info Header Bar -->
                    <tr>
                        <td style='background-color: #f8fafc; padding: 18px 32px; border-bottom: 2px solid #2563eb;'>
                            <div style='font-size: 21px; font-weight: 800; color: #0f172a; margin-bottom: 6px;'>
                                {$eventName}
                            </div>
                            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='font-size: 12px; color: #64748b; line-height: 1.6;'>
                                <tr>
                                    <td>📍 <strong>Venue:</strong> {$location}</td>
                                    <td align='right'>📅 <strong>Date:</strong> {$dateStr}</td>
                                </tr>
                                <tr>
                                    <td>🏷️ <strong>Channel Scope:</strong> {$channelScope}</td>
                                    <td align='right'>⏱️ <strong>Audited:</strong> {$generatedAt}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Email Content -->
                    <tr>
                        <td style='padding: 28px 32px;'>
                            <p style='font-size: 15px; margin: 0 0 12px 0; color: #0f172a;'>
                                Dear <strong>" . htmlspecialchars($recipientName) . "</strong>,
                            </p>
                            
                            <p style='font-size: 13px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;'>
                                Please find below the executive summary and financial performance briefing for <strong>{$eventName}</strong>. A complete, vector-quality official reconciliation report generated via Dompdf is attached to this email for your audit and archival.
                            </p>

                            {$notesBlock}

                            <!-- 4 KPI Metrics Grid -->
                            <div style='margin: 22px 0;'>
                                <table width='100%' border='0' cellspacing='8' cellpadding='0'>
                                    <tr>
                                        <!-- KPI 1: Gross Sales -->
                                        <td width='50%' style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;'>
                                            <div style='font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;'>
                                                Gross Confirmed Value
                                            </div>
                                            <div style='font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 2px 0;'>
                                                LKR " . number_format($t['grossRevenue'], 2) . "
                                            </div>
                                            <div style='font-size: 11px; color: #64748b;'>
                                                " . number_format($t['confirmedOrders']) . " orders &bull; " . number_format($t['confirmedTickets']) . " admissions
                                            </div>
                                        </td>
                                        <!-- KPI 2: Revenue Collected -->
                                        <td width='50%' style='background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px;'>
                                            <div style='font-size: 10px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px;'>
                                                Revenue Realized (Collected)
                                            </div>
                                            <div style='font-size: 18px; font-weight: 800; color: #15803d; margin: 4px 0 2px 0;'>
                                                LKR " . number_format($t['collected'], 2) . "
                                            </div>
                                            <div style='font-size: 11px; color: #166534; font-weight: 600;'>
                                                " . number_format($t['collectionRate'], 1) . "% Cleared &amp; Realized
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <!-- KPI 3: Have To Collect -->
                                        <td width='50%' style='background-color: " . ($t['haveToCollect'] > 0 ? '#fffbeb' : '#f0fdf4') . "; border: 1px solid " . ($t['haveToCollect'] > 0 ? '#fde68a' : '#bbf7d0') . "; border-radius: 8px; padding: 14px;'>
                                            <div style='font-size: 10px; font-weight: 800; text-transform: uppercase; color: " . ($t['haveToCollect'] > 0 ? '#92400e' : '#166534') . "; letter-spacing: 0.5px;'>
                                                Have To Collect (Gate Due)
                                            </div>
                                            <div style='font-size: 18px; font-weight: 800; color: " . ($t['haveToCollect'] > 0 ? '#b45309' : '#15803d') . "; margin: 4px 0 2px 0;'>
                                                LKR " . number_format($t['haveToCollect'], 2) . "
                                            </div>
                                            <div style='font-size: 11px; color: " . ($t['haveToCollect'] > 0 ? '#92400e' : '#166534') . ";'>
                                                " . ($t['haveToCollect'] > 0 ? 'Pending counter / gate collection' : '100% Fully Settled') . "
                                            </div>
                                        </td>
                                        <!-- KPI 4: Gate Scanned -->
                                        <td width='50%' style='background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px;'>
                                            <div style='font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 0.5px;'>
                                                Gate Admissions Scanned
                                            </div>
                                            <div style='font-size: 18px; font-weight: 800; color: #1d4ed8; margin: 4px 0 2px 0;'>
                                                " . number_format($t['totalVerified']) . " / " . number_format($t['confirmedTickets']) . "
                                            </div>
                                            <div style='font-size: 11px; color: #1e40af; font-weight: 600;'>
                                                " . number_format($t['checkInRate'], 1) . "% Attendance Turnout
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Financial Breakdown Table -->
                            <div style='margin: 26px 0 18px 0;'>
                                <div style='font-size: 12px; font-weight: 800; text-transform: uppercase; color: #334155; letter-spacing: 0.5px; margin-bottom: 8px;'>
                                    1. Payment Status &amp; Category Reconciliation
                                </div>
                                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;'>
                                    <thead>
                                        <tr style='background-color: #f1f5f9;'>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; color: #475569; border-bottom: 1px solid #cbd5e1;'>Category</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: center; color: #475569; border-bottom: 1px solid #cbd5e1;'>Tickets</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: right; color: #475569; border-bottom: 1px solid #cbd5e1;'>Gross Value</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: right; color: #475569; border-bottom: 1px solid #cbd5e1;'>Collected</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: right; color: #475569; border-bottom: 1px solid #cbd5e1;'>Gate Due</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {$sbRowsHtml}
                                        <tr style='background-color: #f8fafc; font-weight: 700;'>
                                            <td style='padding: 9px 10px; font-size: 12px; color: #0f172a; border-top: 2px solid #cbd5e1;'>TOTAL CONFIRMED</td>
                                            <td style='padding: 9px 10px; font-size: 12px; text-align: center; color: #0f172a; border-top: 2px solid #cbd5e1;'>" . number_format($t['confirmedTickets']) . "</td>
                                            <td style='padding: 9px 10px; font-size: 12px; text-align: right; color: #0f172a; border-top: 2px solid #cbd5e1;'>LKR " . number_format($t['grossRevenue'], 2) . "</td>
                                            <td style='padding: 9px 10px; font-size: 12px; text-align: right; color: #16a34a; border-top: 2px solid #cbd5e1;'>LKR " . number_format($t['collected'], 2) . "</td>
                                            <td style='padding: 9px 10px; font-size: 12px; text-align: right; color: " . ($t['haveToCollect'] > 0 ? '#d97706' : '#64748b') . "; border-top: 2px solid #cbd5e1;'>LKR " . number_format($t['haveToCollect'], 2) . "</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Sales Channel Attribution Table -->
                            " . (!empty($saRowsHtml) ? "
                            <div style='margin: 24px 0 18px 0;'>
                                <div style='font-size: 12px; font-weight: 800; text-transform: uppercase; color: #334155; letter-spacing: 0.5px; margin-bottom: 8px;'>
                                    2. Sales Channel &amp; Salesman Performance
                                </div>
                                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;'>
                                    <thead>
                                        <tr style='background-color: #f1f5f9;'>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; color: #475569; border-bottom: 1px solid #cbd5e1;'>Channel / Rep</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: center; color: #475569; border-bottom: 1px solid #cbd5e1;'>Type</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: center; color: #475569; border-bottom: 1px solid #cbd5e1;'>Orders</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: center; color: #475569; border-bottom: 1px solid #cbd5e1;'>Tickets</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: right; color: #475569; border-bottom: 1px solid #cbd5e1;'>Collected</th>
                                            <th style='padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: right; color: #475569; border-bottom: 1px solid #cbd5e1;'>Gate Due</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {$saRowsHtml}
                                    </tbody>
                                </table>
                            </div>" : "") . "

                            <!-- PDF Attachment Callout Box -->
                            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 8px; margin: 24px 0;'>
                                <tr>
                                    <td width='48' style='padding: 16px 0 16px 16px; vertical-align: middle;'>
                                        <div style='background-color: #ef4444; color: #ffffff; font-size: 11px; font-weight: 800; padding: 10px 8px; border-radius: 6px; text-align: center; letter-spacing: 0.5px;'>PDF</div>
                                    </td>
                                    <td style='padding: 16px; vertical-align: middle;'>
                                        <div style='font-size: 13px; font-weight: 700; color: #1e3a8a;'>Attached Document: {$pdfFilename}</div>
                                        <div style='font-size: 11px; color: #2563eb; margin-top: 3px;'>Official Dompdf Vector Document &bull; Full Financial Reconciliation, Salesman Attribution &amp; Ticket Tier Audit</div>
                                    </td>
                                </tr>
                            </table>

                            <div style='border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b; line-height: 1.5;'>
                                <p style='margin: 0 0 2px 0;'>Sincerely,</p>
                                <p style='margin: 0; font-weight: 700; color: #0f172a;'>GoTickets.lk Operations &amp; Finance</p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style='background-color: #0f172a; padding: 22px 32px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;'>
                            <div style='color: #ffffff; font-weight: 700; font-size: 12px; margin-bottom: 4px;'>
                                GoTickets.lk &bull; Grand Silver Ray
                            </div>
                            <div>Silver Ray, Dippitigala, Lellopitiya, Ratnapura, Sri Lanka</div>
                            <div>Hotline: <strong style='color: #ffffff;'>+94 71 875 0770</strong> &nbsp;|&nbsp; Support: <strong style='color: #ffffff;'>support@gotickets.lk</strong></div>
                            <div style='margin-top: 8px; color: #64748b; font-size: 10px;'>This email and attached audit document are confidential and intended solely for authorized management.</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
";
    }
}
