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
                SELECT * FROM batch_history 
                WHERE user_id = ?
                ORDER BY saved_at DESC
            ');
            $stmt->execute([$userId]);
            $history = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $history]);
            break;

        case 'get':
            $id = $_GET['id'] ?? '';
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'ID required']);
                break;
            }
            
            $stmt = $pdo->prepare('
                SELECT * FROM batch_history 
                WHERE id = ? AND user_id = ?
            ');
            $stmt->execute([$id, $userId]);
            $record = $stmt->fetch();
            
            if ($record) {
                echo json_encode(['success' => true, 'data' => $record]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Record not found']);
            }
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'save':
            $batchId = trim($input['batch_id'] ?? '');
            $collectorName = trim($input['collector_name'] ?? '');
            $collectionDatetime = $input['collection_datetime'] ?? '';
            $ethanol = floatval($input['ethanol'] ?? 0);
            $ammonia = floatval($input['ammonia'] ?? 0);
            $h2s = floatval($input['h2s'] ?? 0);
            $grade = trim($input['grade'] ?? 'GOOD');
            $shelfLife = floatval($input['shelf_life'] ?? 0);
            
            if (empty($batchId) || empty($collectorName) || empty($collectionDatetime)) {
                echo json_encode(['success' => false, 'error' => 'Batch info is required']);
                break;
            }
            
            // Check if this batch was already saved
            $stmt = $pdo->prepare('SELECT id FROM batch_history WHERE batch_id = ? AND user_id = ?');
            $stmt->execute([$batchId, $userId]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'error' => 'This batch is already saved in history']);
                break;
            }
            
            $stmt = $pdo->prepare('
                INSERT INTO batch_history 
                (batch_id, user_id, collector_name, collection_datetime, ethanol, ammonia, h2s, grade, shelf_life) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $batchId, 
                $userId, 
                $collectorName, 
                $collectionDatetime, 
                $ethanol, 
                $ammonia, 
                $h2s, 
                $grade, 
                $shelfLife
            ]);
            
            $id = $pdo->lastInsertId();
            echo json_encode([
                'success' => true, 
                'data' => [
                    'id' => $id,
                    'batch_id' => $batchId,
                    'message' => 'Batch saved to history successfully'
                ]
            ]);
            break;

        case 'delete':
            $id = $input['id'] ?? '';
            
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'ID required']);
                break;
            }
            
            $stmt = $pdo->prepare('DELETE FROM batch_history WHERE id = ? AND user_id = ?');
            $stmt->execute([$id, $userId]);
            
            echo json_encode(['success' => true]);
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
