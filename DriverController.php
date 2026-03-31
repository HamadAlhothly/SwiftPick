<?php
/**
 * Driver Controller — SwiftPick API (Laravel)
 * Handles driver-specific endpoints: trips, location updates, boarding/dropoff.
 * Uses Socket.IO for real-time location broadcasting to connected clients.
 */

class DriverController
{
    /**
     * GET /api/driver/trips/active
     */
    public static function getActiveTrip(array $user): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT t.id, t.bus_id, b.plate_number, t.route_id, r.name AS route_name,
                    t.status, t.started_at, t.current_lat, t.current_lng,
                    t.created_at, t.updated_at
             FROM trips t
             INNER JOIN buses b ON t.bus_id = b.id
             LEFT JOIN routes r ON t.route_id = r.id
             WHERE t.driver_id = :driver_id AND t.status IN ('confirmed', 'in_progress')
             ORDER BY t.created_at DESC LIMIT 1"
        );
        $stmt->execute([':driver_id' => $user['id']]);
        $trip = $stmt->fetch();

        if (!$trip) {
            Response::success(null, 200, 'No active trip');
            return;
        }

        // Get students on this trip
        $studentStmt = $db->prepare(
            "SELECT ts.id AS trip_student_id, ts.student_id, s.full_name,
                    s.grade, c.name AS class_name,
                    ts.status AS boarding_status, ts.boarded_at, ts.dropped_at,
                    ts.teacher_status, ts.teacher_released_at
             FROM trip_students ts
             INNER JOIN students s ON ts.student_id = s.id
             LEFT JOIN classes c ON s.class_id = c.id
             WHERE ts.trip_id = :trip_id
             ORDER BY s.full_name"
        );
        $studentStmt->execute([':trip_id' => $trip['id']]);
        $trip['students'] = $studentStmt->fetchAll();

        Response::success($trip);
    }

    /**
     * POST /api/driver/trips/{id}/confirm
     */
    public static function confirmTrip(array $user, int $tripId): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT id, status FROM trips WHERE id = :id AND driver_id = :driver_id"
        );
        $stmt->execute([':id' => $tripId, ':driver_id' => $user['id']]);
        $trip = $stmt->fetch();

        if (!$trip) {
            Response::error('Trip not found', 404);
        }
        if ($trip['status'] !== 'scheduled') {
            Response::error('Trip cannot be confirmed (status: ' . $trip['status'] . ')', 400);
        }

        $stmt = $db->prepare(
            "UPDATE trips SET status = 'confirmed', updated_at = NOW() WHERE id = :id"
        );
        $stmt->execute([':id' => $tripId]);

        NotificationHelper::auditLog($user['id'], 'trip.confirmed', 'trip', $tripId);

        Response::success(null, 200, 'Trip confirmed');
    }

    /**
     * POST /api/driver/trips/{id}/location
     */
    public static function updateLocation(array $user, int $tripId): void
    {
        $data = Response::getRequestBody();

        $v = new Validator();
        $v->required($data, ['lat', 'lng'])->validate();

        $db = Database::getConnection();

        // Verify trip ownership
        $stmt = $db->prepare(
            "SELECT id, status FROM trips WHERE id = :id AND driver_id = :driver_id"
        );
        $stmt->execute([':id' => $tripId, ':driver_id' => $user['id']]);
        $trip = $stmt->fetch();

        if (!$trip) {
            Response::error('Trip not found', 404);
        }

        // Update if in_progress or confirmed; also set to in_progress
        $newStatus = ($trip['status'] === 'confirmed') ? 'in_progress' : $trip['status'];

        $stmt = $db->prepare(
            "UPDATE trips SET current_lat = :lat, current_lng = :lng,
                    status = :status, started_at = COALESCE(started_at, NOW()),
                    updated_at = NOW()
             WHERE id = :id"
        );
        $stmt->execute([
            ':lat' => $data['lat'],
            ':lng' => $data['lng'],
            ':status' => $newStatus,
            ':id' => $tripId,
        ]);

        // TODO: Broadcast location via Socket.IO to all parent clients tracking this trip
        // socket_emit('busLocationUpdate', ['tripId' => $tripId, 'lat' => $data['lat'], 'lng' => $data['lng']]);

        Response::success(null, 200, 'Location updated');
    }

    /**
     * POST /api/driver/trips/{id}/board
     */
    public static function boardStudent(array $user, int $tripId): void
    {
        $data = Response::getRequestBody();

        $v = new Validator();
        $v->required($data, ['student_id'])->validate();

        $db = Database::getConnection();

        // Verify trip ownership
        $stmt = $db->prepare(
            "SELECT id FROM trips WHERE id = :id AND driver_id = :driver_id AND status IN ('confirmed', 'in_progress')"
        );
        $stmt->execute([':id' => $tripId, ':driver_id' => $user['id']]);
        if (!$stmt->fetch()) {
            Response::error('Trip not found or not active', 404);
        }

        // Mark student as boarded
        $stmt = $db->prepare(
            "UPDATE trip_students SET status = 'boarded', boarded_at = NOW()
             WHERE trip_id = :trip_id AND student_id = :student_id AND status = 'assigned'"
        );
        $stmt->execute([':trip_id' => $tripId, ':student_id' => $data['student_id']]);

        if ($stmt->rowCount() === 0) {
            Response::error('Student not found on this trip or already boarded', 400);
        }

        // Notify parent
        $parentStmt = $db->prepare(
            "SELECT sp.parent_id, s.full_name FROM parent_student sp
             INNER JOIN students s ON sp.student_id = s.id
             WHERE sp.student_id = :student_id"
        );
        $parentStmt->execute([':student_id' => $data['student_id']]);
        
        $studentName = 'Student';
        while ($row = $parentStmt->fetch()) {
            $studentName = $row['full_name'];
            NotificationHelper::notify(
                $row['parent_id'],
                'Student Boarded',
                "{$row['full_name']} has boarded the bus.",
                'student_boarded',
                $tripId
            );
        }

        NotificationHelper::auditLog($user['id'], 'student.boarded', 'trip_student', $data['student_id']);

        // Broadcast via Socket.IO to update Teacher Dashboard and Parent app in real-time
        if (class_exists('SocketHelper')) {
            SocketHelper::emitStudentBoarded($tripId, $data['student_id'], $studentName);
        }

        Response::success(null, 200, 'Student boarded');
    }

    /**
     * POST /api/driver/trips/{id}/dropoff
     */
    public static function dropoffStudent(array $user, int $tripId): void
    {
        $data = Response::getRequestBody();

        $v = new Validator();
        $v->required($data, ['student_id'])->validate();

        $db = Database::getConnection();

        // Verify trip
        $stmt = $db->prepare(
            "SELECT id FROM trips WHERE id = :id AND driver_id = :driver_id AND status = 'in_progress'"
        );
        $stmt->execute([':id' => $tripId, ':driver_id' => $user['id']]);
        if (!$stmt->fetch()) {
            Response::error('Trip not found or not in progress', 404);
        }

        // Mark dropped off
        $stmt = $db->prepare(
            "UPDATE trip_students SET status = 'dropped_off', dropped_at = NOW()
             WHERE trip_id = :trip_id AND student_id = :student_id AND status = 'boarded'"
        );
        $stmt->execute([':trip_id' => $tripId, ':student_id' => $data['student_id']]);

        if ($stmt->rowCount() === 0) {
            Response::error('Student not boarded on this trip', 400);
        }

        // Notify parent
        $parentStmt = $db->prepare(
            "SELECT sp.parent_id, s.full_name FROM student_parent sp
             INNER JOIN students s ON sp.student_id = s.id
             WHERE sp.student_id = :student_id"
        );
        $parentStmt->execute([':student_id' => $data['student_id']]);
        while ($row = $parentStmt->fetch()) {
            NotificationHelper::notify(
                $row['parent_id'],
                'Student Dropped Off',
                "{$row['full_name']} has been dropped off.",
                'student_dropped',
                $tripId
            );
        }

        Response::success(null, 200, 'Student dropped off');
    }

    /**
     * PATCH /api/driver/trips/{id}/complete
     */
    public static function completeTrip(array $user, int $tripId): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT id FROM trips WHERE id = :id AND driver_id = :driver_id AND status = 'in_progress'"
        );
        $stmt->execute([':id' => $tripId, ':driver_id' => $user['id']]);
        if (!$stmt->fetch()) {
            Response::error('Trip not found or not in progress', 404);
        }

        $stmt = $db->prepare(
            "UPDATE trips SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = :id"
        );
        $stmt->execute([':id' => $tripId]);

        NotificationHelper::auditLog($user['id'], 'trip.completed', 'trip', $tripId);

        // TODO: Broadcast trip completion via Socket.IO
        // socket_emit('tripCompleted', ['tripId' => $tripId]);

        Response::success(null, 200, 'Trip completed');
    }
}
