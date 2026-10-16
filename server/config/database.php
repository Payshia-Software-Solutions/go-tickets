<?php
// config/database.php

require_once __DIR__ . '/env.php';

// Database Connection via Environment Variables
$host    = env('DB_HOST', 'localhost');
$port    = env('DB_PORT', '3306');
$db      = env('DB_NAME', 'payshiac_gotickets');
$user    = env('DB_USER', 'root');
$pass    = env('DB_PASS', '');
$charset = env('DB_CHARSET', 'utf8mb4');

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}
