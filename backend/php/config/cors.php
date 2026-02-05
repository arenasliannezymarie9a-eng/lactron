<?php
// CORS configuration for local development.
// Allows the Vite dev server (localhost:8080) AND the Lovable preview/published origins
// to call the local PHP API served by WAMP at http://localhost:80.

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Explicit allowlist (exact matches)
$allowedOrigins = [
    'http://localhost',           // WAMP default (port 80 implicit)
    'http://localhost:80',
    'http://127.0.0.1',
    'http://127.0.0.1:80',
    'http://localhost:8080',      // Vite dev server
    'http://127.0.0.1:8080',
    'http://192.168.8.145',       // PC's local network IP (no port = 80)
    'http://192.168.8.145:80',
    'http://192.168.8.145:8080',
];

// Allow any localhost/127.0.0.1 port for development (Vite may auto-pick 8081/8082/etc.)
$isLocalDevOrigin = false;
if (!empty($origin)) {
    $isLocalDevOrigin = preg_match('#^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$#i', $origin) === 1;
}

// Allow any 192.168.x.x IP address (local network) for ESP32 communication
// Matches with or without port (port 80 is often omitted)
$isLocalNetworkOrigin = false;
if (!empty($origin)) {
    $isLocalNetworkOrigin = preg_match('#^https?://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$#', $origin) === 1;
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

if (in_array($origin, $allowedOrigins, true) || $isLovableOrigin || $isLocalDevOrigin || $isLocalNetworkOrigin) {
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
