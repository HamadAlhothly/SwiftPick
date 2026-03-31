<?php
/**
 * CORS Configuration — SwiftPick API
 * Call this early in index.php before any output.
 */

function setupCORS(): void
{
    // Allowed origins (adjust for production)
    $allowedOrigins = [
        'http://localhost',
        'http://localhost:3000',
        'http://localhost:8081', // Expo default
        'http://localhost:19006', // Expo web
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    }
    else {
        // For development, allow all origins
        header("Access-Control-Allow-Origin: *");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");

    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
