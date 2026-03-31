<?php
/**
 * Application Constants — SwiftPick API
 */

// JWT Configuration
define('JWT_SECRET', 'swiftpick_jwt_secret_key_change_in_production_2024');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRY', 86400); // 24 hours in seconds
define('JWT_REFRESH_WINDOW', 7200); // Last 2 hours allow refresh

// Bcrypt cost
define('BCRYPT_COST', 12);

// Geofence defaults
define('DEFAULT_GEOFENCE_RADIUS', 200); // meters

// Pagination
define('DEFAULT_PAGE_SIZE', 20);
define('MAX_PAGE_SIZE', 100);

// Rate limiting (login)
define('LOGIN_MAX_ATTEMPTS', 5);
define('LOGIN_WINDOW_SECONDS', 60);

// App info
define('APP_NAME', 'SwiftPick');
define('APP_VERSION', '1.0.0');

// Base URL (adjust for your Laragon setup)
define('BASE_URL', 'http://localhost/swiftpick-api');
define('API_PREFIX', '/api');
