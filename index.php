<?php
/**
 * SwiftPick API — Main Entry Point & Router
 */

// Error reporting (disable display in production)
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// JSON content type for all responses
header('Content-Type: application/json; charset=utf-8');

// Load config
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/cors.php';

// Setup CORS
setupCORS();

// Load helpers
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/JWTHelper.php';
require_once __DIR__ . '/helpers/Validator.php';
require_once __DIR__ . '/helpers/GeofenceHelper.php';
require_once __DIR__ . '/helpers/NotificationHelper.php';
require_once __DIR__ . '/helpers/SocketHelper.php';
require_once __DIR__ . '/helpers/AzureOpenAIHelper.php';

// Load middleware
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/RoleMiddleware.php';

// Load controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ParentController.php';
require_once __DIR__ . '/controllers/TeacherController.php';
require_once __DIR__ . '/controllers/DriverController.php';
require_once __DIR__ . '/controllers/AdminController.php';

// =====================================================
// Parse the request
// =====================================================
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove query string and base path
$basePath = '/swiftpick-api';
$path = parse_url($requestUri, PHP_URL_PATH);
$path = str_replace($basePath, '', $path);
$path = '/' . trim($path, '/');

// =====================================================
// Router
// =====================================================

// Helper: extract ID from path like /api/parent/pickups/5
function extractId(string $path, string $pattern): ?int
{
    if (preg_match($pattern, $path, $matches)) {
        return (int)$matches[1];
    }
    return null;
}

try {
    // ---------------------------------------------------
    // AUTH (public)
    // ---------------------------------------------------
    if ($path === '/api/auth/register' && $requestMethod === 'POST') {
        AuthController::register();
    }
    elseif ($path === '/api/auth/login' && $requestMethod === 'POST') {
        AuthController::login();
    }
    elseif ($path === '/api/auth/refresh' && $requestMethod === 'POST') {
        $user = AuthMiddleware::authenticate();
        AuthController::refresh($user);
    }
    elseif ($path === '/api/auth/me' && $requestMethod === 'GET') {
        $user = AuthMiddleware::authenticate();
        AuthController::me($user);
    }

    // ---------------------------------------------------
    // PARENT endpoints
    // ---------------------------------------------------
    elseif (preg_match('#^/api/parent/#', $path)) {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireRole($user, 'parent');

        if ($path === '/api/parent/children' && $requestMethod === 'GET') {
            ParentController::getChildren($user);
        }
        elseif (preg_match('#^/api/parent/children/(\d+)$#', $path, $m) && $requestMethod === 'GET') {
            ParentController::getChild($user, (int)$m[1]);
        }
        elseif ($path === '/api/parent/pickups' && $requestMethod === 'POST') {
            ParentController::createPickup($user);
        }
        elseif ($path === '/api/parent/pickups' && $requestMethod === 'GET') {
            ParentController::getPickups($user);
        }
        elseif ($path === '/api/parent/pickups/active' && $requestMethod === 'GET') {
            ParentController::getActivePickups($user);
        }
        elseif (preg_match('#^/api/parent/pickups/(\d+)$#', $path, $m) && $requestMethod === 'DELETE') {
            ParentController::cancelPickup($user, (int)$m[1]);
        }
        elseif ($path === '/api/parent/notifications' && $requestMethod === 'GET') {
            ParentController::getNotifications($user);
        }
        elseif (preg_match('#^/api/parent/notifications/(\d+)/read$#', $path, $m) && $requestMethod === 'PATCH') {
            ParentController::markNotificationRead($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/parent/bus-tracking/(\d+)$#', $path, $m) && $requestMethod === 'GET') {
            ParentController::getBusTracking($user, (int)$m[1]);
        }
        else {
            Response::error('Parent endpoint not found', 404);
        }
    }

    // ---------------------------------------------------
    // TEACHER endpoints
    // ---------------------------------------------------
    elseif (preg_match('#^/api/teacher/#', $path)) {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireRole($user, 'teacher');

        if ($path === '/api/teacher/class' && $requestMethod === 'GET') {
            TeacherController::getClass($user);
        }
        elseif ($path === '/api/teacher/pickups/pending' && $requestMethod === 'GET') {
            TeacherController::getPendingPickups($user);
        }
        elseif (preg_match('#^/api/teacher/pickups/(\d+)/dismiss$#', $path, $m) && $requestMethod === 'PATCH') {
            TeacherController::dismissPickup($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/teacher/pickups/(\d+)/cancel$#', $path, $m) && $requestMethod === 'PATCH') {
            TeacherController::cancelPickup($user, (int)$m[1]);
        }
        elseif ($path === '/api/teacher/pickups/history' && $requestMethod === 'GET') {
            TeacherController::getPickupHistory($user);
        }
        elseif (preg_match('#^/api/teacher/trips/(\d+)/confirm$#', $path, $m) && $requestMethod === 'POST') {
            TeacherController::confirmTrip($user, (int)$m[1]);
        }
        elseif ($path === '/api/teacher/trips/active' && $requestMethod === 'GET') {
            TeacherController::getActiveRouteTrips($user);
        }
        elseif (preg_match('#^/api/teacher/trips/(\d+)/students/(\d+)/release$#', $path, $m) && $requestMethod === 'POST') {
            TeacherController::releaseStudent($user, (int)$m[1], (int)$m[2]);
        }
        else {
            Response::error('Teacher endpoint not found', 404);
        }
    }

    // ---------------------------------------------------
    // DRIVER endpoints
    // ---------------------------------------------------
    elseif (preg_match('#^/api/driver/#', $path)) {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireRole($user, 'driver');

        if ($path === '/api/driver/trips/active' && $requestMethod === 'GET') {
            DriverController::getActiveTrip($user);
        }
        elseif (preg_match('#^/api/driver/trips/(\d+)/confirm$#', $path, $m) && $requestMethod === 'POST') {
            DriverController::confirmTrip($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/driver/trips/(\d+)/location$#', $path, $m) && $requestMethod === 'POST') {
            DriverController::updateLocation($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/driver/trips/(\d+)/board$#', $path, $m) && $requestMethod === 'POST') {
            DriverController::boardStudent($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/driver/trips/(\d+)/dropoff$#', $path, $m) && $requestMethod === 'POST') {
            DriverController::dropoffStudent($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/driver/trips/(\d+)/complete$#', $path, $m) && $requestMethod === 'PATCH') {
            DriverController::completeTrip($user, (int)$m[1]);
        }
        else {
            Response::error('Driver endpoint not found', 404);
        }
    }

    // ---------------------------------------------------
    // ADMIN endpoints
    // ---------------------------------------------------
    elseif (preg_match('#^/api/admin/#', $path)) {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireRole($user, 'admin');

        // --- Users ---
        if ($path === '/api/admin/users' && $requestMethod === 'GET') {
            AdminController::getUsers();
        }
        elseif ($path === '/api/admin/users' && $requestMethod === 'POST') {
            AdminController::createUser($user);
        }
        elseif (preg_match('#^/api/admin/users/(\d+)$#', $path, $m) && $requestMethod === 'GET') {
            AdminController::getUser((int)$m[1]);
        }
        elseif (preg_match('#^/api/admin/users/(\d+)$#', $path, $m) && $requestMethod === 'PUT') {
            AdminController::updateUser($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/admin/users/(\d+)$#', $path, $m) && $requestMethod === 'DELETE') {
            AdminController::deleteUser($user, (int)$m[1]);
        }

        // --- Students ---
        elseif ($path === '/api/admin/students' && $requestMethod === 'GET') {
            AdminController::getStudents();
        }
        elseif ($path === '/api/admin/students' && $requestMethod === 'POST') {
            AdminController::createStudent($user);
        }
        elseif (preg_match('#^/api/admin/students/(\d+)$#', $path, $m) && $requestMethod === 'PUT') {
            AdminController::updateStudent($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/admin/students/(\d+)$#', $path, $m) && $requestMethod === 'DELETE') {
            AdminController::deleteStudent($user, (int)$m[1]);
        }
        elseif (preg_match('#^/api/admin/students/(\d+)/assign-parent$#', $path, $m) && $requestMethod === 'POST') {
            AdminController::assignParent($user, (int)$m[1]);
        }

        // --- Classes ---
        elseif ($path === '/api/admin/classes' && $requestMethod === 'GET') {
            AdminController::getClasses();
        }
        elseif ($path === '/api/admin/classes' && $requestMethod === 'POST') {
            AdminController::createClass($user);
        }
        elseif (preg_match('#^/api/admin/classes/(\d+)$#', $path, $m) && $requestMethod === 'PUT') {
            AdminController::updateClass($user, (int)$m[1]);
        }

        // --- Buses ---
        elseif ($path === '/api/admin/buses' && $requestMethod === 'GET') {
            AdminController::getBuses();
        }
        elseif ($path === '/api/admin/buses' && $requestMethod === 'POST') {
            AdminController::createBus($user);
        }
        elseif (preg_match('#^/api/admin/buses/(\d+)$#', $path, $m) && $requestMethod === 'PUT') {
            AdminController::updateBus($user, (int)$m[1]);
        }

        // --- Routes ---
        elseif ($path === '/api/admin/routes' && $requestMethod === 'GET') {
            AdminController::getRoutes();
        }
        elseif ($path === '/api/admin/routes' && $requestMethod === 'POST') {
            AdminController::createRoute($user);
        }
        elseif (preg_match('#^/api/admin/routes/(\d+)$#', $path, $m) && $requestMethod === 'PUT') {
            AdminController::updateRoute($user, (int)$m[1]);
        }

        // --- Trips ---
        elseif ($path === '/api/admin/trips' && $requestMethod === 'GET') {
            AdminController::getTrips();
        }
        elseif ($path === '/api/admin/trips' && $requestMethod === 'POST') {
            AdminController::createTrip($user);
        }

        // --- Monitoring ---
        elseif ($path === '/api/admin/pickups/live' && $requestMethod === 'GET') {
            AdminController::getLivePickups();
        }
        elseif ($path === '/api/admin/audit-logs' && $requestMethod === 'GET') {
            AdminController::getAuditLogs();
        }
        elseif ($path === '/api/admin/stats/dashboard' && $requestMethod === 'GET') {
            AdminController::getDashboardStats();
        }

        // --- Geofences ---
        elseif ($path === '/api/admin/geofences' && $requestMethod === 'GET') {
            AdminController::getGeofences();
        }
        elseif ($path === '/api/admin/geofences' && $requestMethod === 'POST') {
            AdminController::createGeofence($user);
        }
        elseif (preg_match('#^/api/admin/geofences/(\d+)$#', $path, $m) && $requestMethod === 'PUT') {
            AdminController::updateGeofence($user, (int)$m[1]);
        }
        else {
            Response::error('Admin endpoint not found', 404);
        }
    }

    // ---------------------------------------------------
    // API root
    // ---------------------------------------------------
    elseif ($path === '/api' || $path === '/api/' || $path === '/') {
        Response::success([
            'name' => APP_NAME,
            'version' => APP_VERSION,
            'status' => 'running'
        ]);
    }

    // ---------------------------------------------------
    // 404
    // ---------------------------------------------------
    else {
        Response::error('Endpoint not found', 404);
    }

}
catch (Exception $e) {
    error_log('SwiftPick Error: ' . $e->getMessage());
    Response::error('Internal server error', 500);
}
