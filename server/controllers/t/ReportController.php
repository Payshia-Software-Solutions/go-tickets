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
            $mail->isHTML(true);
            $mail->Subject = "Executive Event Report: {$eventName} - GoTickets.lk";
            $mail->Body = $this->buildEmailBodyHtml($eventName, $pdfResult, $notes, $recipientName);

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
        foreach ($showtimes as $st) {
            $bId = $st['booking_id'];
            $eventBookingIds[$bId] = true;
            $qty = intval($st['ticket_count'] ?? 1);
            $bookingTicketCountMap[$bId] = ($bookingTicketCountMap[$bId] ?? 0) + $qty;
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
        $totalVerified = 0;
        foreach ($verifications as $v) {
            $qty = intval($v['ticket_count'] ?? 0);
            $totalVerified += $qty;
            $ttId = $v['tickettype_id'] ?? 0;
            $verifiedByTier[$ttId] = ($verifiedByTier[$ttId] ?? 0) + $qty;
        }

        // 7. Filter and categorize bookings
        $confirmedBookings = [];
        $incompleteOnlineBookings = [];

        foreach ($rawBookings as $b) {
            $bId = $b['id'];
            $matchesEvent = $isAllEvents || isset($eventBookingIds[$bId]) || (isset($b['eventId']) && strval($b['eventId']) === strval($eventId));
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

            $enriched = [
                'id' => $bId,
                'customer_name' => trim(($b['first_name'] ?? '') . ' ' . ($b['last_name'] ?? '')) ?: ($b['userName'] ?? 'Guest'),
                'contact' => $b['contact_number'] ?? $b['email'] ?? 'N/A',
                'category' => $category,
                'booked_type' => $bookedType,
                'gross' => $gross,
                'collected' => $collected,
                'balance' => $balance,
                'ticket_count' => $ticketCount,
                'salesman_id' => $b['salesman_id'] ?? null,
                'salesman_name' => $b['salesman_name'] ?? null,
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

        $pdfBytes = $dompdf->output();

        return [
            'pdf_bytes' => $pdfBytes,
            'event_name' => $eventName,
            'event_location' => $eventLocation,
            'event_date' => $eventDateStr,
            'totals' => [
                'confirmedOrders' => $totConfirmedOrders,
                'confirmedTickets' => $totConfirmedTickets,
                'grossRevenue' => $totGrossRevenue,
                'collected' => $totCollected,
                'haveToCollect' => $totHaveToCollect,
                'collectionRate' => $collectionRate,
                'totalVerified' => $totalVerified,
                'checkInRate' => $checkInRate,
            ]
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

        ob_start();
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Event Performance & Financial Report - <?php echo $eventName; ?></title>
            <style>
                @page {
                    margin: 12mm 10mm 15mm 10mm;
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
                    font-size: 12px;
                    font-weight: bold;
                    color: #1e293b;
                    margin: 12px 0 6px 0;
                    padding-bottom: 3px;
                    border-bottom: 1px solid #e2e8f0;
                }

                /* Standard Data Table */
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 12px;
                    font-size: 10px;
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
    private function buildEmailBodyHtml($eventName, $pdfResult, $notes, $recipientName)
    {
        $t = $pdfResult['totals'];
        $notesHtml = !empty($notes) ? "
            <div style='background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #334155;'>
                <strong>Sender Note:</strong><br>" . nl2br(htmlspecialchars($notes)) . "
            </div>" : "";

        return "
        <div style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;'>
            <div style='background-color: #2563eb; padding: 24px; text-align: center; color: #ffffff;'>
                <h1 style='margin: 0; font-size: 22px; font-weight: bold;'>GoTickets.lk</h1>
                <p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;'>Official Event Performance & Financial Audit</p>
            </div>
            <div style='padding: 24px; color: #1e293b;'>
                <p style='font-size: 15px; margin-top: 0;'>Dear " . htmlspecialchars($recipientName) . ",</p>
                <p style='font-size: 14px; line-height: 1.5;'>Please find attached the official <strong>Event Performance & Financial Audit Report</strong> for <strong>" . htmlspecialchars($eventName) . "</strong>.</p>
                
                {$notesHtml}

                <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;'>
                    <h3 style='margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;'>Executive Financial Snapshot</h3>
                    <table style='width: 100%; border-collapse: collapse; font-size: 13px;'>
                        <tr>
                            <td style='padding: 6px 0; color: #64748b;'>Confirmed Orders:</td>
                            <td style='padding: 6px 0; font-weight: bold; text-align: right;'>" . number_format($t['confirmedOrders']) . " orders</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; color: #64748b;'>Confirmed Tickets:</td>
                            <td style='padding: 6px 0; font-weight: bold; text-align: right;'>" . number_format($t['confirmedTickets']) . " admissions</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; color: #64748b;'>Confirmed Gross Value:</td>
                            <td style='padding: 6px 0; font-weight: bold; color: #2563eb; text-align: right;'>LKR " . number_format($t['grossRevenue'], 2) . "</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; color: #64748b;'>Revenue Collected:</td>
                            <td style='padding: 6px 0; font-weight: bold; color: #16a34a; text-align: right;'>LKR " . number_format($t['collected'], 2) . " (" . number_format($t['collectionRate'], 1) . "% Realized)</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; color: #64748b;'>Have To Collect (Gate Due):</td>
                            <td style='padding: 6px 0; font-weight: bold; color: #d97706; text-align: right;'>LKR " . number_format($t['haveToCollect'], 2) . "</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; color: #64748b;'>Gate Check-in Progress:</td>
                            <td style='padding: 6px 0; font-weight: bold; text-align: right;'>" . number_format($t['totalVerified']) . " / " . number_format($t['confirmedTickets']) . " (" . number_format($t['checkInRate'], 1) . "%)</td>
                        </tr>
                    </table>
                </div>

                <p style='font-size: 13px; color: #64748b;'>The full detailed reconciliation, payment category breakdown, salesman attribution, and ticket tier sales are available in the attached PDF document.</p>
                
                <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'>
                <p style='font-size: 12px; color: #94a3b8; margin: 0;'>
                    Sent securely via GoTickets.lk Automated Event Reporting System.<br>
                    Silver Ray, Dippitigala, Lellopitiya, Ratnapura, Sri Lanka. Hotline: +94 71 875 0770
                </p>
            </div>
        </div>
        ";
    }
}
