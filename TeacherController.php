<?php
/**
 * Teacher Controller — SwiftPick API (Laravel)
 * Endpoints for teacher role: class management, pickup dismissals.
 * Dismissal status changes are broadcast in real-time via Socket.IO.
 */

class TeacherController
{

    /**
     * GET /api/teacher/class
     * Get the teacher's assigned class with students.
     */
    public static function getClass(array $user): void
    {
        $db = Database::getConnection();

        // Find class assigned to this teacher
        $stmt = $db->prepare(
            "SELECT c.id, c.name FROM classes c WHERE c.teacher_id = :teacher_id"
        );
        $stmt->execute([':teacher_id' => $user['id']]);
        $class = $stmt->fetch();

        if (!$class) {
            Response::error('No class assigned to you', 404);
        }

        // Get students in this class
        $stmt = $db->prepare(
            "SELECT s.id, s.full_name, s.grade, s.photo_url
             FROM students s
             WHERE s.class_id = :class_id AND s.is_active = 1
             ORDER BY s.full_name"
        );
        $stmt->execute([':class_id' => $class['id']]);
        $class['students'] = $stmt->fetchAll();

        Response::success($class);
    }

    /**
     * GET /api/teacher/pickups/pending
     * Get pending pickup requests for students in the teacher's class.
     */
    public static function getPendingPickups(array $user): void
    {
        $db = Database::getConnection();

        // Get the teacher's class
        $stmt = $db->prepare("SELECT id FROM classes WHERE teacher_id = :teacher_id");
        $stmt->execute([':teacher_id' => $user['id']]);
        $class = $stmt->fetch();

        if (!$class) {
            Response::success([]);
            return;
        }

        $stmt = $db->prepare(
            "SELECT p.id, p.status, p.arrival_lat, p.arrival_lng, p.arrived_at, p.created_at,
                    s.id AS student_id, s.full_name AS student_name, s.photo_url,
                    u.id AS parent_id, u.full_name AS parent_name, u.phone AS parent_phone
             FROM pickups p
             JOIN students s ON s.id = p.student_id
             JOIN users u ON u.id = p.parent_id
             WHERE s.class_id = :class_id
               AND p.status IN ('pending', 'teacher_notified')
             ORDER BY p.arrived_at ASC"
        );
        $stmt->execute([':class_id' => $class['id']]);

        Response::success($stmt->fetchAll());
    }

    /**
     * PATCH /api/teacher/pickups/{id}/dismiss
     * Confirm student dismissal.
     */
    public static function dismissPickup(array $user, int $pickupId): void
    {
        $db = Database::getConnection();

        // Verify pickup belongs to teacher's class
        $stmt = $db->prepare(
            "SELECT p.*, s.class_id, s.full_name AS student_name
             FROM pickups p
             JOIN students s ON s.id = p.student_id
             JOIN classes c ON c.id = s.class_id
             WHERE p.id = :id AND c.teacher_id = :teacher_id"
        );
        $stmt->execute([':id' => $pickupId, ':teacher_id' => $user['id']]);
        $pickup = $stmt->fetch();

        if (!$pickup) {
            Response::error('Pickup not found or not in your class', 404);
        }

        if ($pickup['status'] === 'dismissed') {
            Response::error('Student has already been dismissed', 400);
        }

        if ($pickup['status'] === 'cancelled') {
            Response::error('This pickup was cancelled', 400);
        }

        // Dismiss
        $stmt = $db->prepare(
            "UPDATE pickups SET status = 'dismissed', dismissed_at = NOW(), dismissed_by = :teacher_id
             WHERE id = :id"
        );
        $stmt->execute([':id' => $pickupId, ':teacher_id' => $user['id']]);

        // Notify the parent
        NotificationHelper::create(
            $pickup['parent_id'],
            'Student Dismissed',
            $pickup['student_name'] . ' has been dismissed by ' . $user['full_name'],
            'dismissed',
            $pickupId
        );

        // Audit log
        NotificationHelper::auditLog(
            $user['id'], 'pickup.dismissed', 'pickup', $pickupId,
        ['status' => $pickup['status']],
        ['status' => 'dismissed', 'dismissed_by' => $user['id']]
        );

        Response::success(['pickup_id' => $pickupId, 'status' => 'dismissed'], 200, 'Student dismissed');
    }

    /**
     * PATCH /api/teacher/pickups/{id}/cancel
     * Cancel/reject a pickup request.
     */
    public static function cancelPickup(array $user, int $pickupId): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare(
            "SELECT p.*, s.class_id
             FROM pickups p
             JOIN students s ON s.id = p.student_id
             JOIN classes c ON c.id = s.class_id
             WHERE p.id = :id AND c.teacher_id = :teacher_id"
        );
        $stmt->execute([':id' => $pickupId, ':teacher_id' => $user['id']]);
        $pickup = $stmt->fetch();

        if (!$pickup) {
            Response::error('Pickup not found or not in your class', 404);
        }

        if ($pickup['status'] === 'dismissed' || $pickup['status'] === 'cancelled') {
            Response::error('Pickup is already ' . $pickup['status'], 400);
        }

        $stmt = $db->prepare("UPDATE pickups SET status = 'cancelled' WHERE id = :id");
        $stmt->execute([':id' => $pickupId]);

        // Notify parent
        NotificationHelper::create(
            $pickup['parent_id'],
            'Pickup Cancelled',
            'Your pickup request has been cancelled by the teacher.',
            'general',
            $pickupId
        );

        NotificationHelper::auditLog(
            $user['id'], 'pickup.cancelled_by_teacher', 'pickup', $pickupId,
        ['status' => $pickup['status']],
        ['status' => 'cancelled']
        );

        Response::success(null, 200, 'Pickup cancelled');
    }

    /**
     * GET /api/teacher/pickups/history
     * Get dismissal history for the teacher's class.
     */
    public static function getPickupHistory(array $user): void
    {
        $db = Database::getConnection();
        $pagination = Response::getPagination();

        $stmt = $db->prepare("SELECT id FROM classes WHERE teacher_id = :teacher_id");
        $stmt->execute([':teacher_id' => $user['id']]);
        $class = $stmt->fetch();

        if (!$class) {
            Response::paginated([], 0, $pagination['page'], $pagination['per_page']);
            return;
        }

        $stmt = $db->prepare(
            "SELECT COUNT(*) as total FROM pickups p
             JOIN students s ON s.id = p.student_id
             WHERE s.class_id = :class_id"
        );
        $stmt->execute([':class_id' => $class['id']]);
        $total = (int)$stmt->fetch()['total'];

        $stmt = $db->prepare(
            "SELECT p.*, s.full_name AS student_name, u.full_name AS parent_name
             FROM pickups p
             JOIN students s ON s.id = p.student_id
             JOIN users u ON u.id = p.parent_id
             WHERE s.class_id = :class_id
             ORDER BY p.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':class_id', $class['id'], PDO::PARAM_INT);
        $stmt->bindValue(':limit', $pagination['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    /**
     * POST /api/teacher/trips/{id}/confirm
     * Teacher confirms a trip (dual verification with driver).
     */
    public static function confirmTrip(array $user, int $tripId): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM trips WHERE id = :id");
        $stmt->execute([':id' => $tripId]);
        $trip = $stmt->fetch();

        if (!$trip) {
            Response::error('Trip not found', 404);
        }

        if ($trip['status'] === 'teacher_confirmed' || $trip['status'] === 'in_progress') {
            Response::error('Trip already confirmed by teacher', 400);
        }

        // Determine next status based on current
        $newStatus = ($trip['status'] === 'driver_confirmed') ? 'in_progress' : 'teacher_confirmed';
        $startedAt = ($newStatus === 'in_progress') ? ", started_at = NOW()" : "";

        $stmt = $db->prepare("UPDATE trips SET status = :status $startedAt WHERE id = :id");
        $stmt->execute([':status' => $newStatus, ':id' => $tripId]);

        // If both confirmed, notify parents
        if ($newStatus === 'in_progress') {
            // Get all parents of students on this bus route
            $stmt2 = $db->prepare(
                "SELECT DISTINCT ps.parent_id
                 FROM parent_student ps
                 JOIN students s ON s.id = ps.student_id
                 JOIN classes c ON c.id = s.class_id"
            );
            $stmt2->execute();
            $parents = $stmt2->fetchAll();
            foreach ($parents as $parent) {
                NotificationHelper::create(
                    $parent['parent_id'],
                    'Bus Trip Started',
                    'The school bus has started its trip.',
                    'trip_started',
                    $tripId
                );
            }
        }

        NotificationHelper::auditLog(
            $user['id'], 'trip.teacher_confirmed', 'trip', $tripId,
        ['status' => $trip['status']],
        ['status' => $newStatus]
        );

        Response::success(['trip_id' => $tripId, 'status' => $newStatus]);
    }

    /**
     * GET /api/teacher/trips/active
     * Fetches active bus trips for the teacher's class for the shared checklist.
     */
    public static function getActiveRouteTrips(array $user): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT id FROM classes WHERE teacher_id = :teacher_id");
        $stmt->execute([':teacher_id' => $user['id']]);
        $class = $stmt->fetch();

        if (!$class) {
            Response::success(null, 200, 'No class assigned');
            return;
        }

        // Find active trips that contain students from this teacher's class
        $stmt = $db->prepare(
            "SELECT DISTINCT t.id, t.bus_id, b.plate_number, b.bus_number, t.route_id, r.name AS route_name, t.status
             FROM trips t
             INNER JOIN buses b ON t.bus_id = b.id
             LEFT JOIN routes r ON t.route_id = r.id
             INNER JOIN trip_students ts ON ts.trip_id = t.id
             INNER JOIN students s ON s.id = ts.student_id
             WHERE s.class_id = :class_id AND t.status IN ('confirmed', 'in_progress', 'teacher_confirmed')
             ORDER BY t.created_at DESC"
        );
        $stmt->execute([':class_id' => $class['id']]);
        $trips = $stmt->fetchAll();

        foreach ($trips as &$trip) {
            $studentStmt = $db->prepare(
                "SELECT ts.id AS trip_student_id, ts.student_id, s.full_name, s.grade,
                        ts.status AS boarding_status, ts.teacher_status, ts.boarded_at, ts.teacher_released_at
                 FROM trip_students ts
                 INNER JOIN students s ON ts.student_id = s.id
                 WHERE ts.trip_id = :trip_id AND s.class_id = :class_id
                 ORDER BY s.full_name"
            );
            $studentStmt->execute([':trip_id' => $trip['id'], ':class_id' => $class['id']]);
            $trip['students'] = $studentStmt->fetchAll();
        }

        Response::success($trips);
    }

    /**
     * POST /api/teacher/trips/{id}/students/{studentId}/release
     * Teacher marks student as released from school, broadcasting to driver.
     */
    public static function releaseStudent(array $user, int $tripId, int $studentId): void
    {
        $db = Database::getConnection();

        // Ensure teacher owns this class/student
        $stmt = $db->prepare(
            "SELECT s.id FROM students s
             JOIN classes c ON c.id = s.class_id
             WHERE s.id = :student_id AND c.teacher_id = :teacher_id"
        );
        $stmt->execute([':student_id' => $studentId, ':teacher_id' => $user['id']]);
        if (!$stmt->fetch()) {
            Response::error('Student not found in your class', 403);
        }

        // Ensure student is on this trip
        $stmt = $db->prepare(
            "UPDATE trip_students SET teacher_status = 'released', teacher_released_at = NOW()
             WHERE trip_id = :trip_id AND student_id = :student_id AND teacher_status = 'waiting'"
        );
        $stmt->execute([':trip_id' => $tripId, ':student_id' => $studentId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Student not on this trip or already released', 400);
        }

        // Real-time broadcast to the Driver's BoardingScreen
        if (class_exists('SocketHelper') && method_exists('SocketHelper', 'emitStudentReleased')) {
            SocketHelper::emitStudentReleased($tripId, $studentId);
        }

        NotificationHelper::auditLog($user['id'], 'student.released_by_teacher', 'trip_student', $studentId);

        Response::success(null, 200, 'Student released to bus');
    }
}
