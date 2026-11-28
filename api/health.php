<?php
require_once __DIR__ . '/db.php';

try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM records");
    $count = $stmt->fetchColumn();

    echo json_encode([
        'status' => 'ok',
        'server' => 'aaPanel / PHP MySQL',
        'database' => 'mysql',
        'recordCount' => (int)$count,
        'timestamp' => round(microtime(true) * 1000),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'server' => 'aaPanel / PHP MySQL',
        'error' => $e->getMessage()
    ]);
}
