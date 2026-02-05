

# Fix CORS Configuration for Current Setup

## Current Issue

The CORS configuration has outdated comments and the local network origin regex doesn't handle requests without a port number (ESP32 sends to port 80, which browsers omit in the Origin header).

## Current Architecture

| Component | URL |
|-----------|-----|
| Vite (Frontend) | `http://localhost:8080` |
| WAMP (PHP API) | `http://localhost:80/lactron/backend/php/api/` |
| ESP32 | Direct to `http://192.168.8.145/lactron/api/` (port 80) |

## Changes Required

### File: `backend/php/config/cors.php`

1. **Update comment** to reflect current setup (WAMP on port 80, not 8080)

2. **Fix local network regex** to also match origins without port (port 80 is implicit):
   - Current: `^https?://192\.168\.\d{1,3}\.\d{1,3}:\d+$` (requires port)
   - Fixed: `^https?://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$` (port optional)

3. **Add `http://localhost` without port** to explicit allowlist (WAMP default)

## Updated Code

```php
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

// ... rest of file unchanged
```

## Summary

| Line | Change |
|------|--------|
| 2-4 | Update comment to mention WAMP on port 80 |
| 9-15 | Expand allowlist to include origins without port |
| 20 | Make port optional in localhost regex: `(:\d+)?` |
| 26 | Make port optional in local network regex: `(:\d+)?` |

