<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $kind = $_GET['kind'] ?? null;
        $includeDeleted = isset($_GET['includeDeleted']) && ($_GET['includeDeleted'] === 'true' || $_GET['includeDeleted'] === '1');
        $tenantId = $_GET['tenantId'] ?? null;

        $sql = "SELECT id, tenant_id, user_id, kind, data, updated_at, deleted FROM records WHERE 1=1";
        $params = [];

        if ($kind) {
            $sql .= " AND kind = :kind";
            $params[':kind'] = $kind;
        }
        if (!$includeDeleted) {
            $sql .= " AND deleted = 0";
        }
        if ($tenantId) {
            $sql .= " AND (tenant_id = :tenantId OR tenant_id IS NULL)";
            $params[':tenantId'] = $tenantId;
        }
        $sql .= " ORDER BY updated_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $data = array_map(function ($r) {
            return [
                'id' => $r['id'],
                'tenant_id' => $r['tenant_id'],
                'user_id' => $r['user_id'],
                'kind' => $r['kind'],
                'data' => json_decode($r['data'], true),
                'updatedAt' => (int)$r['updated_at'],
                'deleted' => (int)$r['deleted'],
            ];
        }, $rows);

        echo json_encode(['success' => true, 'count' => count($data), 'data' => $data]);
        break;

    case 'POST':
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);

        if (!$body || empty($body['id']) || empty($body['kind'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'id dan kind wajib diisi']);
            exit();
        }

        $id = $body['id'];
        $tenantId = $body['tenantId'] ?? 'tenant-demo-smpn2';
        $userId = $body['userId'] ?? 'usr-guru-budi';
        $kind = $body['kind'];
        $dataStr = is_string($body['data']) ? $body['data'] : json_encode($body['data'] ?? []);
        $updatedAt = isset($body['updatedAt']) ? (int)$body['updatedAt'] : round(microtime(true) * 1000);
        $deleted = !empty($body['deleted']) ? 1 : 0;

        $sql = "INSERT INTO records (id, tenant_id, user_id, kind, data, updated_at, deleted)
                VALUES (:id, :tenantId, :userId, :kind, :data, :updatedAt, :deleted)
                ON DUPLICATE KEY UPDATE
                    tenant_id = VALUES(tenant_id),
                    user_id = VALUES(user_id),
                    kind = VALUES(kind),
                    data = VALUES(data),
                    updated_at = VALUES(updated_at),
                    deleted = VALUES(deleted)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':tenantId' => $tenantId,
            ':userId' => $userId,
            ':kind' => $kind,
            ':data' => $dataStr,
            ':updatedAt' => $updatedAt,
            ':deleted' => $deleted,
        ]);

        echo json_encode(['success' => true, 'id' => $id, 'updatedAt' => $updatedAt]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
            $id = end($parts);
        }

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID wajib diisi']);
            exit();
        }

        $hard = isset($_GET['hard']) && $_GET['hard'] === 'true';

        if ($hard) {
            $stmt = $pdo->prepare("DELETE FROM records WHERE id = :id");
            $stmt->execute([':id' => $id]);
        } else {
            $now = round(microtime(true) * 1000);
            $stmt = $pdo->prepare("UPDATE records SET deleted = 1, updated_at = :updatedAt WHERE id = :id");
            $stmt->execute([':updatedAt' => $now, ':id' => $id]);
        }

        echo json_encode(['success' => true, 'id' => $id]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
