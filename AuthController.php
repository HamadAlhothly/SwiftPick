<?php
/**
 * Auth Controller — SwiftPick API (Laravel)
 * Handles registration, login, token refresh, and profile.
 */

class AuthController
{

    /**
     * POST /api/auth/register
     * Create a new user account.
     */
    public static function register(): void
    {
        $data = Response::getRequestBody();

        // Validate input
        $v = new Validator();
        $v->required($data, ['full_name', 'email', 'password', 'role'])
            ->email($data, 'email')
            ->minLength($data, 'password', 6)
            ->maxLength($data, 'full_name', 100)
            ->inList($data, 'role', ['parent', 'teacher', 'driver', 'admin'])
            ->validate();

        $db = Database::getConnection();

        // Check if email already exists
        $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
        $stmt->execute([':email' => strtolower(trim($data['email']))]);
        if ($stmt->fetch()) {
            Response::error('Email already registered', 409);
        }

        // Hash password
        $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);

        // Insert user
        $stmt = $db->prepare(
            "INSERT INTO users (full_name, email, phone, password_hash, role)
             VALUES (:full_name, :email, :phone, :password_hash, :role)"
        );
        $stmt->execute([
            ':full_name' => trim($data['full_name']),
            ':email' => strtolower(trim($data['email'])),
            ':phone' => $data['phone'] ?? null,
            ':password_hash' => $passwordHash,
            ':role' => $data['role']
        ]);

        $userId = (int)$db->lastInsertId();

        // Audit log
        NotificationHelper::auditLog($userId, 'user.register', 'user', $userId);

        Response::created([
            'id' => $userId,
            'email' => strtolower(trim($data['email'])),
            'role' => $data['role']
        ], 'Account created successfully');
    }

    /**
     * POST /api/auth/login
     * Authenticate user and return JWT.
     */
    public static function login(): void
    {
        $data = Response::getRequestBody();

        // Validate input
        $v = new Validator();
        $v->required($data, ['email', 'password'])->validate();

        $db = Database::getConnection();

        // Find user by email
        $stmt = $db->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->execute([':email' => strtolower(trim($data['email']))]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Invalid email or password', 401);
        }

        // Check if active
        if (!$user['is_active']) {
            Response::error('Account is deactivated. Contact the administrator.', 403);
        }

        // Verify password
        if (!password_verify($data['password'], $user['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }

        // Generate token
        $token = JWTHelper::generateToken($user);

        // Audit log
        NotificationHelper::auditLog($user['id'], 'auth.login', 'user', $user['id']);

        // Return token + profile (never return password_hash)
        Response::success([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role']
            ]
        ], 200, 'Login successful');
    }

    /**
     * POST /api/auth/refresh
     * Issue a new JWT (only if current token is within refresh window).
     */
    public static function refresh(array $user): void
    {
        // Re-fetch the full user to generate a fresh token
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE id = :id AND is_active = 1");
        $stmt->execute([':id' => $user['id']]);
        $fullUser = $stmt->fetch();

        if (!$fullUser) {
            Response::error('User not found', 404);
        }

        $token = JWTHelper::generateToken($fullUser);

        Response::success([
            'token' => $token
        ], 200, 'Token refreshed');
    }

    /**
     * GET /api/auth/me
     * Get the current authenticated user's profile.
     */
    public static function me(array $user): void
    {
        // $user already has what we need from AuthMiddleware
        Response::success([
            'id' => $user['id'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'role' => $user['role']
        ]);
    }
}
