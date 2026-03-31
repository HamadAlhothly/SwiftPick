<?php
/**
 * Database Configuration — SwiftPick API (Laravel-style)
 * PDO Singleton Connection
 * 
 * Production: Azure Database for MySQL
 * Local Dev:  localhost (Laragon/XAMPP)
 */

class Database
{
    private static ?PDO $instance = null;

    // Azure MySQL: swiftpick-mysql.mysql.database.azure.com
    // Local Dev: localhost
    private static string $host = 'localhost';
    private static string $db = 'swiftpick_db';
    private static string $user = 'root';
    private static string $pass = '';
    private static string $charset = 'utf8mb4';

    /**
     * Get the PDO connection instance (singleton).
     */
    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $dsn = "mysql:host=" . self::$host .
                ";dbname=" . self::$db .
                ";charset=" . self::$charset;

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            try {
                self::$instance = new PDO($dsn, self::$user, self::$pass, $options);
            }
            catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed: ' . $e->getMessage()
                ]);
                exit;
            }
        }

        return self::$instance;
    }

    /**
     * Prevent cloning.
     */
    private function __clone()
    {
    }
}
