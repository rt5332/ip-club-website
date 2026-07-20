<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $status, bool $success, string $message): void
{
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
    ]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'This endpoint accepts POST requests only.');
}

session_name('hsipa_contact');
session_start();

$now = time();
$recent = $_SESSION['hsipa_message_times'] ?? [];
$recent = array_values(array_filter($recent, static function ($timestamp) use ($now): bool {
    return is_int($timestamp) && $timestamp > $now - 600;
}));

if (count($recent) >= 4) {
    respond(429, false, 'Too many messages were sent recently. Please wait a few minutes and try again.');
}

// Bots commonly fill fields that are visually hidden from real visitors.
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    respond(200, true, 'Message received.');
}

$type = trim((string) ($_POST['type'] ?? 'contact'));
$name = trim((string) ($_POST['name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));
$context = trim((string) ($_POST['context'] ?? 'General HSIPA question'));
$school = trim((string) ($_POST['school'] ?? ''));
$state = trim((string) ($_POST['state'] ?? ''));
$role = trim((string) ($_POST['role'] ?? ''));

if ($name === '' || strlen($name) > 120) {
    respond(422, false, 'Please enter a valid name.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    respond(422, false, 'Please enter a valid email address.');
}

if ($type === 'chapter_interest') {
    if ($school === '' || $state === '' || $role === '') {
        respond(422, false, 'Please complete the school, state, and role fields.');
    }
} elseif ($message === '') {
    respond(422, false, 'Please enter a message.');
}

if (strlen($message) > 5000 || strlen($context) > 180 || strlen($school) > 180 || strlen($state) > 80 || strlen($role) > 120) {
    respond(422, false, 'One or more fields are too long.');
}

$safeName = preg_replace('/[\r\n]+/', ' ', $name) ?: 'Website visitor';
$safeContext = preg_replace('/[\r\n]+/', ' ', $context) ?: 'HSIPA website message';
$safeSchool = preg_replace('/[\r\n]+/', ' ', $school) ?: '';
$recipient = 'arnav.chaphalkar@gmail.com';
$subject = $type === 'chapter_interest'
    ? 'HSIPA chapter interest: ' . ($safeSchool !== '' ? $safeSchool : $safeName)
    : 'HSIPA website: ' . $safeContext;

$lines = [
    'A new message was submitted through the HSIPA website.',
    '',
    'Name: ' . $safeName,
    'Email: ' . $email,
    'Regarding: ' . $safeContext,
];

if ($type === 'chapter_interest') {
    $lines[] = 'School: ' . $school;
    $lines[] = 'State: ' . $state;
    $lines[] = 'Role: ' . $role;
}

$lines[] = '';
$lines[] = 'Message:';
$lines[] = $message !== '' ? $message : 'No additional message.';

$body = implode("\r\n", $lines);
$headers = implode("\r\n", [
    'From: HSIPA Website <no-reply@iclubs.org>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
]);

if (!@mail($recipient, $subject, $body, $headers)) {
    respond(500, false, 'The hosting server could not send the message. Please use the email fallback below.');
}

$recent[] = $now;
$_SESSION['hsipa_message_times'] = $recent;
respond(200, true, 'Your message was sent to the HSIPA team.');
