<?php
/**
 * Admin Controller — SwiftPick API (Laravel)
 * CRUD for all entities, monitoring, audit logs, and dashboard stats.
 * Deployed on Microsoft Azure App Service.
 */

class AdminController
{

    // =========================================================
    // USERS
    // =========================================================

    /** GET /api/admin/users */
    public static function getUsers(): void
    {
        $db = Database::getConnection();
        $pagination = Response::getPagination();
        $role = Response::getQueryParam('role');

        $where = "1=1";
        $params = [];
        if ($role) {
            $where .= " AND role = :role";
            $params[':role'] = $role;
        }

        $stmt = $db->prepare("SELECT COUNT(*) as total FROM users WHERE $where");
        $stmt->execute($params);
        $total = (int)$stmt->fetch()['total'];

        $sql = "SELECT id, full_name, email, phone, role, is_active, created_at
                FROM users WHERE $where ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v)
            $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit', $pagination['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    /** POST /api/admin/users */
    public static function createUser(array $admin): void
    {
        $data = Response::getRequestBody();
        $v = new Validator();
        $v->required($data, ['full_name', 'email', 'password', 'role'])
            ->email($data, 'email')
            ->minLength($data, 'password', 6)
            ->inList($data, 'role', ['admin', 'teacher', 'parent', 'driver'])
            ->validate();

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
        $stmt->execute([':email' => strtolower(trim($data['email']))]);
        if ($stmt->fetch()) {
            Response::error('Email already exists', 409);
        }

        $hash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        $stmt = $db->prepare(
            "INSERT INTO users (full_name, email, phone, password_hash, role)
             VALUES (:name, :email, :phone, :hash, :role)"
        );
        $stmt->execute([
            ':name' => trim($data['full_name']),
            ':email' => strtolower(trim($data['email'])),
            ':phone' => $data['phone'] ?? null,
            ':hash' => $hash,
            ':role' => $data['role']
        ]);
        $id = (int)$db->lastInsertId();

        NotificationHelper::auditLog($admin['id'], 'admin.user.created', 'user', $id);
        Response::created(['id' => $id]);
    }

    /** GET /api/admin/users/{id} */
    public static function getUser(int $id): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT id, full_name, email, phone, role, is_active, created_at, updated_at
             FROM users WHERE id = :id"
        );
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();
        if (!$user)
            Response::error('User not found', 404);
        Response::success($user);
    }

    /** PUT /api/admin/users/{id} */
    public static function updateUser(array $admin, int $id): void
    {
        $data = Response::getRequestBody();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch();
        if (!$existing)
            Response::error('User not found', 404);

        $fields = [];
        $params = [':id' => $id];

        if (isset($data['full_name'])) {
            $fields[] = "full_name = :name";
            $params[':name'] = trim($data['full_name']);
        }
        if (isset($data['email'])) {
            $fields[] = "email = :email";
            $params[':email'] = strtolower(trim($data['email']));
        }
        if (isset($data['phone'])) {
            $fields[] = "phone = :phone";
            $params[':phone'] = $data['phone'];
        }
        if (isset($data['role'])) {
            $fields[] = "role = :role";
            $params[':role'] = $data['role'];
        }
        if (isset($data['is_active'])) {
            $fields[] = "is_active = :active";
            $params[':active'] = (int)$data['is_active'];
        }
        if (isset($data['password'])) {
            $fields[] = "password_hash = :hash";
            $params[':hash'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        }

        if (empty($fields))
            Response::error('No fields to update', 400);

        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
        $db->prepare($sql)->execute($params);

        NotificationHelper::auditLog($admin['id'], 'admin.user.updated', 'user', $id);
        Response::success(null, 200, 'User updated');
    }

    /** DELETE /api/admin/users/{id} (soft deactivate) */
    public static function deleteUser(array $admin, int $id): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET is_active = 0 WHERE id = :id");
        $stmt->execute([':id' => $id]);
        if ($stmt->rowCount() === 0)
            Response::error('User not found', 404);

        NotificationHelper::auditLog($admin['id'], 'admin.user.deactivated', 'user', $id);
        Response::success(null, 200, 'User deactivated');
    }

    // =========================================================
    // STUDENTS
    // =========================================================

    /** GET /api/admin/students */
    public static function getStudents(): void
    {
        $db = Database::getConnection();
        $pagination = Response::getPagination();

        $stmt = $db->prepare("SELECT COUNT(*) as total FROM students");
        $stmt->execute();
        $total = (int)$stmt->fetch()['total'];

        $stmt = $db->prepare(
            "SELECT s.*, c.name AS class_name
             FROM students s
             LEFT JOIN classes c ON c.id = s.class_id
             ORDER BY s.full_name
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':limit', $pagination['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    /** POST /api/admin/students */
    public static function createStudent(array $admin): void
    {
        $data = Response::getRequestBody();
        $v = new Validator();
        $v->required($data, ['full_name'])->validate();

        $db = Database::getConnection();
        $stmt = $db->prepare(
            "INSERT INTO students (full_name, grade, class_id, photo_url)
             VALUES (:name, :grade, :class_id, :photo)"
        );
        $stmt->execute([
            ':name' => trim($data['full_name']),
            ':grade' => $data['grade'] ?? null,
            ':class_id' => $data['class_id'] ?? null,
            ':photo' => $data['photo_url'] ?? null
        ]);
        $id = (int)$db->lastInsertId();

        NotificationHelper::auditLog($admin['id'], 'admin.student.created', 'student', $id);
        Response::created(['id' => $id]);
    }

    /** PUT /api/admin/students/{id} */
    public static function updateStudent(array $admin, int $id): void
    {
        $data = Response::getRequestBody();
        $db = Database::getConnection();

        $fields = [];
        $params = [':id' => $id];

        if (isset($data['full_name'])) {
            $fields[] = "full_name = :name";
            $params[':name'] = trim($data['full_name']);
        }
        if (isset($data['grade'])) {
            $fields[] = "grade = :grade";
            $params[':grade'] = $data['grade'];
        }
        if (isset($data['class_id'])) {
            $fields[] = "class_id = :class_id";
            $params[':class_id'] = $data['class_id'];
        }
        if (isset($data['photo_url'])) {
            $fields[] = "photo_url = :photo";
            $params[':photo'] = $data['photo_url'];
        }
        if (isset($data['is_active'])) {
            $fields[] = "is_active = :active";
            $params[':active'] = (int)$data['is_active'];
        }

        if (empty($fields))
            Response::error('No fields to update', 400);

        $db->prepare("UPDATE students SET " . implode(', ', $fields) . " WHERE id = :id")->execute($params);
        NotificationHelper::auditLog($admin['id'], 'admin.student.updated', 'student', $id);
        Response::success(null, 200, 'Student updated');
    }

    /** DELETE /api/admin/students/{id} (soft deactivate) */
    public static function deleteStudent(array $admin, int $id): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE students SET is_active = 0 WHERE id = :id");
        $stmt->execute([':id' => $id]);
        if ($stmt->rowCount() === 0)
            Response::error('Student not found', 404);

        NotificationHelper::auditLog($admin['id'], 'admin.student.deactivated', 'student', $id);
        Response::success(null, 200, 'Student deactivated');
    }

    /** POST /api/admin/students/{id}/assign-parent */
    public static function assignParent(array $admin, int $studentId): void
    {
        $data = Response::getRequestBody();
        $v = new Validator();
        $v->required($data, ['parent_id'])->integer($data, 'parent_id')->validate();

        $db = Database::getConnection();

        // Verify parent exists and has parent role
        $stmt = $db->prepare("SELECT id FROM users WHERE id = :id AND role = 'parent'");
        $stmt->execute([':id' => $data['parent_id']]);
        if (!$stmt->fetch())
            Response::error('Parent not found', 404);

        // Verify student exists
        $stmt = $db->prepare("SELECT id FROM students WHERE id = :id");
        $stmt->execute([':id' => $studentId]);
        if (!$stmt->fetch())
            Response::error('Student not found', 404);

        // Insert link (ignore duplicate)
        $stmt = $db->prepare(
            "INSERT IGNORE INTO parent_student (parent_id, student_id, relationship)
             VALUES (:parent_id, :student_id, :relationship)"
        );
        $stmt->execute([
            ':parent_id' => $data['parent_id'],
            ':student_id' => $studentId,
            ':relationship' => $data['relationship'] ?? 'parent'
        ]);

        NotificationHelper::auditLog($admin['id'], 'admin.parent_student.assigned', 'parent_student', null,
            null, ['parent_id' => $data['parent_id'], 'student_id' => $studentId]);
        Response::created(null, 'Parent assigned to student');
    }

    // =========================================================
    // CLASSES
    // =========================================================

    /** GET /api/admin/classes */
    public static function getClasses(): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT c.*, u.full_name AS teacher_name,
                    (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.is_active = 1) AS student_count
             FROM classes c
             LEFT JOIN users u ON u.id = c.teacher_id
             ORDER BY c.name"
        );
        $stmt->execute();
        Response::success($stmt->fetchAll());
    }

    /** POST /api/admin/classes */
    public static function createClass(array $admin): void
    {
        $data = Response::getRequestBody();
        $v = new Validator();
        $v->required($data, ['name'])->validate();

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO classes (name, teacher_id) VALUES (:name, :teacher_id)");
        $stmt->execute([
            ':name' => trim($data['name']),
            ':teacher_id' => $data['teacher_id'] ?? null
        ]);
        $id = (int)$db->lastInsertId();

        NotificationHelper::auditLog($admin['id'], 'admin.class.created', 'class', $id);
        Response::created(['id' => $id]);
    }

    /** PUT /api/admin/classes/{id} */
    public static function updateClass(array $admin, int $id): void
    {
        $data = Response::getRequestBody();
        $db = Database::getConnection();

        $fields = [];
        $params = [':id' => $id];
        if (isset($data['name'])) {
            $fields[] = "name = :name";
            $params[':name'] = trim($data['name']);
        }
        if (isset($data['teacher_id'])) {
            $fields[] = "teacher_id = :tid";
            $params[':tid'] = $data['teacher_id'];
        }

        if (empty($fields))
            Response::error('No fields to update', 400);

        $db->prepare("UPDATE classes SET " . implode(', ', $fields) . " WHERE id = :id")->execute($params);
        NotificationHelper::auditLog($admin['id'], 'admin.class.updated', 'class', $id);
        Response::success(null, 200, 'Class updated');
    }

    // =========================================================
    // BUSES
    // =========================================================

    /** GET /api/admin/buses */
    public static function getBuses(): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT b.*, u.full_name AS driver_name, r.name AS route_name
             FROM buses b
             LEFT JOIN users u ON u.id = b.driver_id
             LEFT JOIN routes r ON r.id = b.route_id
             ORDER BY b.bus_number"
        );
        $stmt->execute();
        Response::success($stmt->fetchAll());
    }

    /** POST /api/admin/buses */
    public static function createBus(array $admin): void
    {
        $data = Response::getRequestBody();
        $v = new Validator();
        $v->required($data, ['bus_number'])->validate();

        $db = Database::getConnection();
        $stmt = $db->prepare(
            "INSERT INTO buses (bus_number, capacity, driver_id, route_id)
             VALUES (:number, :capacity, :driver, :route)"
        );
        $stmt->execute([
            ':number' => trim($data['bus_number']),
            ':capacity' => $data['capacity'] ?? 30,
            ':driver' => $data['driver_id'] ?? null,
            ':route' => $data['route_id'] ?? null
        ]);
        $id = (int)$db->lastInsertId();

        NotificationHelper::auditLog($admin['id'], 'admin.bus.created', 'bus', $id);
        Response::created(['id' => $id]);
    }

    /** PUT /api/admin/buses/{id} */
    public static function updateBus(array $admin, int $id): void
    {
        $data = Response::getRequestBody();
        $db = Database::getConnection();

        $fields = [];
        $params = [':id' => $id];
        if (isset($data['bus_number'])) {
            $fields[] = "bus_number = :num";
            $params[':num'] = trim($data['bus_number']);
        }
        if (isset($data['capacity'])) {
            $fields[] = "capacity = :cap";
            $params[':cap'] = (int)$data['capacity'];
        }
        if (isset($data['driver_id'])) {
            $fields[] = "driver_id = :drv";
            $params[':drv'] = $data['driver_id'];
        }
        if (isset($data['route_id'])) {
            $fields[] = "route_id = :rt";
            $params[':rt'] = $data['route_id'];
        }
        if (isset($data['is_active'])) {
            $fields[] = "is_active = :act";
            $params[':act'] = (int)$data['is_active'];
        }

        if (empty($fields))
            Response::error('No fields to update', 400);

        $db->prepare("UPDATE buses SET " . implode(', ', $fields) . " WHERE id = :id")->execute($params);
        NotificationHelper::auditLog($admin['id'], 'admin.bus.updated', 'bus', $id);
        Response::success(null, 200, 'Bus updated');
    }

    // =========================================================
    // ROUTES
    // =========================================================

    /** GET /api/admin/routes */
    public static function getRoutes(): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM routes ORDER BY name");
        $stmt->execute();
        $routes = $stmt->fetchAll();

        // Attach stops to each route
        foreach ($routes as &$route) {
            $stmt = $db->prepare(
                "SELECT * FROM route_stops WHERE route_id = :id ORDER BY stop_order"
            );
            $stmt->execute([':id' => $route['id']]);
            $route['stops'] = $stmt->fetchAll();
        }

        Response::success($routes);
    }

    /** POST /api/admin/routes */
    public static function createRoute(array $admin): void
    {
        $data = Response::getRequestBody();
        $v = new Validator();
        $v->required($data, ['name'])->validate();

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare(
                "INSERT INTO routes (name, description) VALUES (:name, :desc)"
            );
            $stmt->execute([
                ':name' => trim($data['name']),
                ':desc' => $data['description'] ?? null
            ]);
            $routeId = (int)$db->lastInsertId();

            // Insert stops if provided
            if (!empty($data['stops']) && is_array($data['stops'])) {
                $stmt = $db->prepare(
                    "INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, radius_meters)
                     VALUES (:route_id, :name, :lat, :lng, :ord, :radius)"
                );
                foreach ($data['stops'] as $i => $stop) {
                    $stmt->execute([
                        ':route_id' => $routeId,
                        ':name' => $stop['stop_name'],
                        ':lat' => $stop['latitude'],
                        ':lng' => $stop['longitude'],
                        ':ord' => $stop['stop_order'] ?? ($i + 1),
                        ':radius' => $stop['radius_meters'] ?? 100
                    ]);
                }
            }

            $db->commit();
            NotificationHelper::auditLog($admin['id'], 'admin.route.created', 'route', $routeId);
            Response::created(['id' => $routeId]);
        }
        catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to create route: ' . $e->getMessage(), 500);
        }
    }

    /** PUT /api/admin/routes/{id} */
    public static function updateRoute(array $admin, int $id): void
    {
        $data = Response::getRequestBody();
        $db = Database::getConnection();

        $fields = [];
        $params = [':id' => $id];
        if (isset($data['name'])) {
            $fields[] = "name = :name";
            $params[':name'] = trim($data['name']);
        }
        if (isset($data['description'])) {
            $fields[] = "description = :desc";
            $params[':desc'] = $data['description'];
        }
        if (isset($data['is_active'])) {
            $fields[] = "is_active = :act";
            $params[':act'] = (int)$data['is_active'];
        }

        if (!empty($fields)) {
            $db->prepare("UPDATE routes SET " . implode(', ', $fields) . " WHERE id = :id")->execute($params);
        }

        // Update stops if provided (replace all)
        if (isset($data['stops']) && is_array($data['stops'])) {
            $db->prepare("DELETE FROM route_stops WHERE route_id = :id")->execute([':id' => $id]);
            $stmt = $db->prepare(
                "INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, radius_meters)
                 VALUES (:route_id, :name, :lat, :lng, :ord, :radius)"
            );
            foreach ($data['stops'] as $i => $stop) {
                $stmt->execute([
                    ':route_id' => $id,
                    ':name' => $stop['stop_name'],
                    ':lat' => $stop['latitude'],
                    ':lng' => $stop['longitude'],
                    ':ord' => $stop['stop_order'] ?? ($i + 1),
                    ':radius' => $stop['radius_meters'] ?? 100
                ]);
            }
        }

        NotificationHelper::auditLog($admin['id'], 'admin.route.updated', 'route', $id);
        Response::success(null, 200, 'Route updated');
    }

    // =========================================================
    // TRIPS
    // =========================================================

    /** GET /api/admin/trips */
    public static function getTrips(): void
    {
        $db = Database::getConnection();
        $pagination = Response::getPagination();

        $stmt = $db->prepare("SELECT COUNT(*) as total FROM trips");
        $stmt->execute();
        $total = (int)$stmt->fetch()['total'];

        $stmt = $db->prepare(
            "SELECT t.*, b.bus_number, r.name AS route_name, u.full_name AS driver_name
             FROM trips t
             JOIN buses b ON b.id = t.bus_id
             JOIN routes r ON r.id = t.route_id
             JOIN users u ON u.id = t.driver_id
             ORDER BY t.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':limit', $pagination['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    /** POST /api/admin/trips */
    public static function createTrip(array $admin): void
    {
        $data = Response::getRequestBody();
        $v = new Validator();
        $v->required($data, ['bus_id', 'route_id', 'driver_id'])->validate();

        $db = Database::getConnection();
        $stmt = $db->prepare(
            "INSERT INTO trips (bus_id, route_id, driver_id, status)
             VALUES (:bus, :route, :driver, 'pending')"
        );
        $stmt->execute([
            ':bus' => $data['bus_id'],
            ':route' => $data['route_id'],
            ':driver' => $data['driver_id']
        ]);
        $id = (int)$db->lastInsertId();

        NotificationHelper::auditLog($admin['id'], 'admin.trip.created', 'trip', $id);
        Response::created(['id' => $id]);
    }

    // =========================================================
    // MONITORING
    // =========================================================

    /** GET /api/admin/pickups/live */
    public static function getLivePickups(): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT p.*, s.full_name AS student_name, s.grade,
                    c.name AS class_name, u.full_name AS parent_name, u.phone AS parent_phone
             FROM pickups p
             JOIN students s ON s.id = p.student_id
             LEFT JOIN classes c ON c.id = s.class_id
             JOIN users u ON u.id = p.parent_id
             WHERE p.status IN ('pending', 'teacher_notified')
             ORDER BY p.arrived_at ASC"
        );
        $stmt->execute();
        Response::success($stmt->fetchAll());
    }

    /** GET /api/admin/audit-logs */
    public static function getAuditLogs(): void
    {
        $db = Database::getConnection();
        $pagination = Response::getPagination();

        $stmt = $db->prepare("SELECT COUNT(*) as total FROM audit_logs");
        $stmt->execute();
        $total = (int)$stmt->fetch()['total'];

        $stmt = $db->prepare(
            "SELECT al.*, u.full_name AS user_name
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.user_id
             ORDER BY al.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':limit', $pagination['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    /** GET /api/admin/stats/dashboard */
    public static function getDashboardStats(): void
    {
        $db = Database::getConnection();

        $stats = [];

        // Total counts
        $tables = ['users', 'students', 'buses', 'routes'];
        foreach ($tables as $table) {
            $stmt = $db->query("SELECT COUNT(*) as count FROM $table");
            $stats["total_$table"] = (int)$stmt->fetch()['count'];
        }

        // Active trips
        $stmt = $db->query("SELECT COUNT(*) as count FROM trips WHERE status IN ('in_progress', 'pending', 'driver_confirmed', 'teacher_confirmed')");
        $stats['active_trips'] = (int)$stmt->fetch()['count'];

        // Today's pickups
        $stmt = $db->query("SELECT COUNT(*) as count FROM pickups WHERE DATE(created_at) = CURDATE()");
        $stats['today_pickups'] = (int)$stmt->fetch()['count'];

        // Today's dismissed
        $stmt = $db->query("SELECT COUNT(*) as count FROM pickups WHERE DATE(dismissed_at) = CURDATE() AND status = 'dismissed'");
        $stats['today_dismissed'] = (int)$stmt->fetch()['count'];

        // Pending pickups
        $stmt = $db->query("SELECT COUNT(*) as count FROM pickups WHERE status IN ('pending', 'teacher_notified')");
        $stats['pending_pickups'] = (int)$stmt->fetch()['count'];

        // Users by role
        $stmt = $db->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
        $stats['users_by_role'] = $stmt->fetchAll();

        Response::success($stats);
    }

    // =========================================================
    // GEOFENCES
    // =========================================================

    /** GET /api/admin/geofences */
    public static function getGeofences(): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM geofences ORDER BY name");
        $stmt->execute();
        Response::success($stmt->fetchAll());
    }

    /** POST /api/admin/geofences */
    public static function createGeofence(array $admin): void
    {
        $data = Response::getRequestBody();
        $v = new Validator();
        $v->required($data, ['name', 'latitude', 'longitude'])
            ->latitude($data, 'latitude')
            ->longitude($data, 'longitude')
            ->validate();

        $db = Database::getConnection();
        $stmt = $db->prepare(
            "INSERT INTO geofences (name, latitude, longitude, radius_meters)
             VALUES (:name, :lat, :lng, :radius)"
        );
        $stmt->execute([
            ':name' => trim($data['name']),
            ':lat' => $data['latitude'],
            ':lng' => $data['longitude'],
            ':radius' => $data['radius_meters'] ?? DEFAULT_GEOFENCE_RADIUS
        ]);
        $id = (int)$db->lastInsertId();

        NotificationHelper::auditLog($admin['id'], 'admin.geofence.created', 'geofence', $id);
        Response::created(['id' => $id]);
    }

    /** PUT /api/admin/geofences/{id} */
    public static function updateGeofence(array $admin, int $id): void
    {
        $data = Response::getRequestBody();
        $db = Database::getConnection();

        $fields = [];
        $params = [':id' => $id];
        if (isset($data['name'])) {
            $fields[] = "name = :name";
            $params[':name'] = trim($data['name']);
        }
        if (isset($data['latitude'])) {
            $fields[] = "latitude = :lat";
            $params[':lat'] = $data['latitude'];
        }
        if (isset($data['longitude'])) {
            $fields[] = "longitude = :lng";
            $params[':lng'] = $data['longitude'];
        }
        if (isset($data['radius_meters'])) {
            $fields[] = "radius_meters = :r";
            $params[':r'] = (int)$data['radius_meters'];
        }
        if (isset($data['is_active'])) {
            $fields[] = "is_active = :act";
            $params[':act'] = (int)$data['is_active'];
        }

        if (empty($fields))
            Response::error('No fields to update', 400);

        $db->prepare("UPDATE geofences SET " . implode(', ', $fields) . " WHERE id = :id")->execute($params);
        NotificationHelper::auditLog($admin['id'], 'admin.geofence.updated', 'geofence', $id);
        Response::success(null, 200, 'Geofence updated');
    }
}
