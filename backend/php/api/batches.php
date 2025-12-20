<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
session_start();

$pdo = getConnection();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

$userId = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            $stmt = $pdo->prepare('
                SELECT b.*, 
                    (SELECT COUNT(*) FROM sensor_readings sr WHERE sr.batch_id = b.batch_id) as reading_count,
                    (SELECT predicted_shelf_life FROM sensor_readings sr WHERE sr.batch_id = b.batch_id ORDER BY created_at DESC LIMIT 1) as latest_shelf_life
                FROM batches b 
                WHERE b.user_id = ?
                ORDER BY b.created_at DESC
            ');
            $stmt->execute([$userId]);
            $batches = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $batches]);
            break;

        case 'get':
            $batchId = $_GET['batch_id'] ?? '';
            if (empty($batchId)) {
                echo json_encode(['success' => false, 'error' => 'Batch ID required']);
                break;
            }
            
            $stmt = $pdo->prepare('
                SELECT b.*, 
                    (SELECT COUNT(*) FROM sensor_readings sr WHERE sr.batch_id = b.batch_id) as reading_count
                FROM batches b 
                WHERE b.batch_id = ? AND b.user_id = ?
            ');
            $stmt->execute([$batchId, $userId]);
            $batch = $stmt->fetch();
            
            if ($batch) {
                echo json_encode(['success' => true, 'data' => $batch]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Batch not found']);
            }
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'create':
            $batchIdentifier = trim($input['batch_id'] ?? '');
            $collectorName = trim($input['collector_name'] ?? '');
            $collectionDatetime = $input['collection_datetime'] ?? '';
            
            if (empty($batchIdentifier) || empty($collectorName) || empty($collectionDatetime)) {
                echo json_encode(['success' => false, 'error' => 'Batch identifier, collector name, and collection date/time are required']);
                break;
            }
            
            // Check if batch ID already exists
            $stmt = $pdo->prepare('SELECT id FROM batches WHERE batch_id = ?');
            $stmt->execute([$batchIdentifier]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'error' => 'Batch identifier already exists']);
                break;
            }
            
            $stmt = $pdo->prepare('INSERT INTO batches (batch_id, user_id, collector_name, collection_datetime) VALUES (?, ?, ?, ?)');
            $stmt->execute([$batchIdentifier, $userId, $collectorName, $collectionDatetime]);
            
            $id = $pdo->lastInsertId();
            echo json_encode([
                'success' => true, 
                'data' => [
                    'id' => $id,
                    'batch_id' => $batchIdentifier,
                    'collector_name' => $collectorName,
                    'collection_datetime' => $collectionDatetime,
                    'status' => 'good'
                ]
            ]);
            break;

        case 'update_status':
            $batchId = $input['batch_id'] ?? '';
            $status = $input['status'] ?? '';
            
            if (empty($batchId) || !in_array($status, ['good', 'spoiled'])) {
                echo json_encode(['success' => false, 'error' => 'Valid batch ID and status required']);
                break;
            }
            
            $stmt = $pdo->prepare('UPDATE batches SET status = ? WHERE batch_id = ? AND user_id = ?');
            $stmt->execute([$status, $batchId, $userId]);
            
            echo json_encode(['success' => true]);
            break;

        case 'delete':
            $batchId = $input['batch_id'] ?? '';
            
            if (empty($batchId)) {
                echo json_encode(['success' => false, 'error' => 'Batch ID required']);
                break;
            }
            
            $stmt = $pdo->prepare('DELETE FROM batches WHERE batch_id = ? AND user_id = ?');
            $stmt->execute([$batchId, $userId]);
            
            echo json_encode(['success' => true]);
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
