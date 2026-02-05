<?php
// CORS configuration for local development.
// Allows the React dev server (localhost:5173) AND the Lovable preview/published origins
// to call the local PHP API at http://localhost:8080.

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Explicit allowlist (exact matches)
$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://192.168.254.100:5173',
    'http://192.168.254.100:8080',
];

// Allow any localhost/127.0.0.1 port for development (Vite may auto-pick 8081/8082/etc.)
$isLocalDevOrigin = false;
if (!empty($origin)) {
    $isLocalDevOrigin = preg_match('#^https?://(localhost|127\\.0\\.0\\.1):\\d+$#i', $origin) === 1;
}

// Allow Lovable preview/published domains.
// Example: https://id-preview--<uuid>.lovable.app
// Example: https://<project>.lovable.app
// Example: https://<uuid>.lovableproject.com
$isLovableOrigin = false;
if (!empty($origin)) {
    $isLovableOrigin = preg_match('#^https://([a-z0-9-]+\.)?lovable\.app$#i', $origin) === 1
        || preg_match('#^https://[a-z0-9-]+\.lovableproject\.com$#i', $origin) === 1;
}

if (in_array($origin, $allowedOrigins, true) || $isLovableOrigin || $isLocalDevOrigin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Chrome Private Network Access (PNA) support for https -> http://localhost
if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_PRIVATE_NETWORK'])) {
    header('Access-Control-Allow-Private-Network: true');
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
