<?php
/**
 * Parent Controller — SwiftPick API (Laravel)
 * Handles parent-specific endpoints: children, pickups, notifications, bus tracking.
 * Bus tracking data is delivered in real-time via Socket.IO.
 */

class ParentController
{
    /**
     * GET /api/parent/children
     */
    public static function getChildren(array $user): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT s.id, s.full_name, s.grade, s.class_id, c.name AS class_name
             FROM students s
             LEFT JOIN classes c ON s.class_id = c.id
             INNER JOIN student_parent sp ON sp.student_id = s.id
             WHERE sp.parent_id = :parent_id
             ORDER BY s.full_name"
        );
        $stmt->execute([':parent_id' => $user['id']]);
        Response::success($stmt->fetchAll());
    }

    /**
     * GET /api/parent/children/{id}
     */
    public static function getChild(array $user, int $studentId): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT s.id, s.full_name, s.grade, s.class_id, c.name AS class_name
             FROM students s
             LEFT JOIN classes c ON s.class_id = c.id
             INNER JOIN student_parent sp ON sp.student_id = s.id
             WHERE sp.parent_id = :parent_id AND s.id = :student_id"
        );
        $stmt->execute([':parent_id' => $user['id'], ':student_id' => $studentId]);
        $child = $stmt->fetch();

        if (!$child) {
            Response::error('Child not found', 404);
        }
        Response::success($child);
    }

    /**
     * POST /api/parent/pickups
     */
    public static function createPickup(array $user): void
    {
        $data = Response::getRequestBody();

        $v = new Validator();
        $v->required($data, ['student_id'])->validate();

        $db = Database::getConnection();

        // Verify this student belongs to this parent
        $stmt = $db->prepare(
            "SELECT s.id FROM students s
             INNER JOIN student_parent sp ON sp.student_id = s.id
             WHERE sp.parent_id = :parent_id AND s.id = :student_id"
        );
        $stmt->execute([':parent_id' => $user['id'], ':student_id' => $data['student_id']]);
        if (!$stmt->fetch()) {
            Response::error('Student not found or not your child', 403);
        }

        // Check no active pickup exists for this student
        $stmt = $db->prepare(
            "SELECT id FROM pickups
             WHERE student_id = :student_id AND status IN ('requested', 'approved', 'en_route')
             ORDER BY created_at DESC LIMIT 1"
        );
        $stmt->execute([':student_id' => $data['student_id']]);
        if ($stmt->fetch()) {
            Response::error('An active pickup already exists for this student', 409);
        }

        // Create pickup
        $stmt = $db->prepare(
            "INSERT INTO pickups (student_id, parent_id, status, pickup_method, notes)
             VALUES (:student_id, :parent_id, 'requested', :method, :notes)"
        );
        $stmt->execute([
            ':student_id' => $data['student_id'],
            ':parent_id' => $user['id'],
            ':method' => $data['pickup_method'] ?? 'self',
            ':notes' => $data['notes'] ?? null,
        ]);

        $pickupId = (int)$db->lastInsertId();

        // Audit
        NotificationHelper::auditLog($user['id'], 'pickup.requested', 'pickup', $pickupId);

        // Notify teacher
        $studentStmt = $db->prepare("SELECT class_id, full_name FROM students WHERE id = :id");
        $studentStmt->execute([':id' => $data['student_id']]);
        $student = $studentStmt->fetch();

        if ($student && $student['class_id']) {
            $teacherStmt = $db->prepare("SELECT teacher_id FROM classes WHERE id = :id");
            $teacherStmt->execute([':id' => $student['class_id']]);
            $class = $teacherStmt->fetch();
            if ($class && $class['teacher_id']) {
                NotificationHelper::notify(
                    $class['teacher_id'],
                    'New Pickup Request',
                    "Pickup requested for {$student['full_name']}",
                    'pickup_request',
                    $pickupId
                );
            }
        }

        Response::created(['id' => $pickupId], 'Pickup requested successfully');
    }

    /**
     * GET /api/parent/pickups
     */
    public static function getPickups(array $user): void
    {
        $db = Database::getConnection();
        $page = (int)($_GET['page'] ?? 1);
        $limit = min((int)($_GET['limit'] ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
        $offset = ($page - 1) * $limit;

        $stmt = $db->prepare(
            "SELECT p.id, p.student_id, s.full_name AS student_name,
                    p.status, p.pickup_method, p.notes, p.created_at, p.updated_at
             FROM pickups p
             INNER JOIN students s ON p.student_id = s.id
             WHERE p.parent_id = :parent_id
             ORDER BY p.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':parent_id', $user['id'], PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        Response::success($stmt->fetchAll());
    }

    /**
     * GET /api/parent/pickups/active
     */
    public static function getActivePickups(array $user): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT p.id, p.student_id, s.full_name AS student_name,
                    p.status, p.pickup_method, p.notes, p.created_at, p.updated_at
             FROM pickups p
             INNER JOIN students s ON p.student_id = s.id
             WHERE p.parent_id = :parent_id AND p.status IN ('requested', 'approved', 'en_route')
             ORDER BY p.created_at DESC"
        );
        $stmt->execute([':parent_id' => $user['id']]);
        Response::success($stmt->fetchAll());
    }

    /**
     * DELETE /api/parent/pickups/{id}
     */
    public static function cancelPickup(array $user, int $pickupId): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT id, status FROM pickups
             WHERE id = :id AND parent_id = :parent_id"
        );
        $stmt->execute([':id' => $pickupId, ':parent_id' => $user['id']]);
        $pickup = $stmt->fetch();

        if (!$pickup) {
            Response::error('Pickup not found', 404);
        }
        if (!in_array($pickup['status'], ['requested', 'approved'])) {
            Response::error('Cannot cancel a pickup that is already ' . $pickup['status'], 400);
        }

        $stmt = $db->prepare("UPDATE pickups SET status = 'cancelled', updated_at = NOW() WHERE id = :id");
        $stmt->execute([':id' => $pickupId]);

        NotificationHelper::auditLog($user['id'], 'pickup.cancelled', 'pickup', $pickupId);

        Response::success(null, 200, 'Pickup cancelled');
    }

    /**
     * GET /api/parent/notifications
     */
    public static function getNotifications(array $user): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT id, title, body, type, is_read, reference_id, created_at
             FROM notifications
             WHERE user_id = :user_id
             ORDER BY created_at DESC
             LIMIT 50"
        );
        $stmt->execute([':user_id' => $user['id']]);
        Response::success($stmt->fetchAll());
    }

    /**
     * PATCH /api/parent/notifications/{id}/read
     */
    public static function markNotificationRead(array $user, int $notifId): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "UPDATE notifications SET is_read = 1
             WHERE id = :id AND user_id = :user_id"
        );
        $stmt->execute([':id' => $notifId, ':user_id' => $user['id']]);

        if ($stmt->rowCount() === 0) {
            Response::error('Notification not found', 404);
        }
        Response::success(null, 200, 'Marked as read');
    }

    /**
     * GET /api/parent/bus-tracking/{studentId}
     */
    public static function getBusTracking(array $user, int $studentId): void
    {
        $db = Database::getConnection();

        // Verify ownership
        $stmt = $db->prepare(
            "SELECT s.id FROM students s
             INNER JOIN student_parent sp ON sp.student_id = s.id
             WHERE sp.parent_id = :parent_id AND s.id = :student_id"
        );
        $stmt->execute([':parent_id' => $user['id'], ':student_id' => $studentId]);
        if (!$stmt->fetch()) {
            Response::error('Student not found', 404);
        }

        // Get active trip for this student
        $stmt = $db->prepare(
            "SELECT t.id AS trip_id, t.status AS trip_status,
                    b.plate_number, b.model AS bus_model,
                    u.full_name AS driver_name,
                    t.current_lat, t.current_lng, t.updated_at AS location_updated
             FROM trips t
             INNER JOIN trip_students ts ON ts.trip_id = t.id
             INNER JOIN buses b ON t.bus_id = b.id
             LEFT JOIN users u ON t.driver_id = u.id
             WHERE ts.student_id = :student_id AND t.status IN ('in_progress', 'confirmed')
             ORDER BY t.created_at DESC LIMIT 1"
        );
        $stmt->execute([':student_id' => $studentId]);
        $tracking = $stmt->fetch();

        if (!$tracking) {
            Response::success(null, 200, 'No active trip found for this student');
            return;
        }

        // NOTE: In production, real-time bus tracking is delivered via Socket.IO
        // The client subscribes to 'busLocationUpdate' events for live GPS updates
        Response::success($tracking);
    }
}
