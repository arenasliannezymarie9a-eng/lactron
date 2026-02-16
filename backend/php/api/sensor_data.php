<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'latest';
    $batchId = $_GET['batch_id'] ?? null;
    
    if ($action === 'latest') {
        $sql = 'SELECT ethanol, ammonia, h2s, status, predicted_shelf_life, created_at 
                FROM sensor_readings ORDER BY created_at DESC LIMIT 1';
        if ($batchId) {
            $sql = 'SELECT ethanol, ammonia, h2s, status, predicted_shelf_life, created_at 
                    FROM sensor_readings WHERE batch_id = ? ORDER BY created_at DESC LIMIT 1';
        }
        $stmt = $batchId ? $pdo->prepare($sql) : $pdo->query($sql);
        if ($batchId) $stmt->execute([$batchId]);
        $data = $stmt->fetch();
        echo json_encode(['success' => true, 'data' => $data ?: null]);
    } else if ($action === 'history') {
        $limit = intval($_GET['limit'] ?? 100);
        $stmt = $pdo->prepare('SELECT sr.ethanol, sr.ammonia, sr.h2s, sr.status, sr.predicted_shelf_life, sr.created_at 
                               FROM sensor_readings sr
                               INNER JOIN batches b ON sr.batch_id = b.batch_id
                               WHERE sr.batch_id = ? AND sr.created_at >= b.created_at
                               ORDER BY sr.created_at DESC LIMIT ?');
        $stmt->execute([$batchId, $limit]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    }
} else if ($method === 'POST') {
    try {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        if (!$input) {
            echo json_encode(['success' => false, 'error' => 'Invalid JSON input', 'raw' => $rawInput]);
            exit;
        }
        
    $batchId = $input['batch_id'] ?? 'DEFAULT';
    $ethanol = floatval($input['ethanol'] ?? 0);
    $ammonia = floatval($input['ammonia'] ?? 0);
    $h2s = floatval($input['h2s'] ?? 0);
    
    // Check if this is a dataset gathering batch
    if (str_starts_with($batchId, 'DATASET-')) {
        // Look up dataset session
        $dsStmt = $pdo->prepare("SELECT * FROM dataset_sessions WHERE batch_id = ? AND session_state = 'active'");
        $dsStmt->execute([$batchId]);
        $dsSession = $dsStmt->fetch();
        
        if (!$dsSession) {
            echo json_encode(['success' => false, 'error' => 'Dataset session is not active (paused or stopped)']);
            exit;
        }
        
        // Compute remaining shelf life excluding paused time
        $initialHours = floatval($dsSession['initial_shelf_life']);
        $startedAt = strtotime($dsSession['started_at']);
        $totalPaused = intval($dsSession['total_paused_seconds']);
        $effectiveElapsed = (time() - $startedAt) - $totalPaused;
        $remainingHours = max(0, round($initialHours - ($effectiveElapsed / 3600), 2));
        
        $statusOverride = $dsSession['status_override'];
        
        $stmt = $pdo->prepare('INSERT INTO sensor_readings (batch_id, ethanol, ammonia, h2s, status, predicted_shelf_life) VALUES (?, ?, ?, ?, ?, ?)');
        $result = $stmt->execute([$batchId, $ethanol, $ammonia, $h2s, $statusOverride, $remainingHours]);
        
        if ($result) {
            $insertId = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => ['status' => $statusOverride, 'shelfLife' => $remainingHours, 'confidence' => 1.0], 'insert_id' => $insertId]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Insert failed', 'errorInfo' => $stmt->errorInfo()]);
        }
        exit;
    }
    
    // Normal batch - Check 30-reading cap
    $countStmt = $pdo->prepare('SELECT COUNT(*) as cnt FROM sensor_readings WHERE batch_id = ?');
    $countStmt->execute([$batchId]);
    $count = $countStmt->fetch()['cnt'];
    
    if ($count >= 30) {
        echo json_encode(['success' => false, 'error' => 'Batch reading limit reached (30/30)', 'limit_reached' => true]);
        exit;
    }
    
    // Call Flask ML server for prediction
    $prediction = callMlServer($ethanol, $ammonia, $h2s);
    
    $stmt = $pdo->prepare('INSERT INTO sensor_readings (batch_id, ethanol, ammonia, h2s, status, predicted_shelf_life) VALUES (?, ?, ?, ?, ?, ?)');
    $result = $stmt->execute([$batchId, $ethanol, $ammonia, $h2s, $prediction['status'], $prediction['shelfLife']]);
    
    if ($result) {
        $insertId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'data' => $prediction, 'insert_id' => $insertId]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Insert failed', 'errorInfo' => $stmt->errorInfo()]);
    }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function callMlServer($ethanol, $ammonia, $h2s) {
    $url = 'http://localhost:5000/predict';
    $data = json_encode(['ethanol' => $ethanol, 'ammonia' => $ammonia, 'h2s' => $h2s]);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200 && $response) {
        $result = json_decode($response, true);
        return ['status' => $result['status'], 'shelfLife' => $result['shelf_life'], 'confidence' => $result['confidence'] ?? 0.9];
    }
    
    // Fallback prediction if ML server unavailable (hours, 0-72)
    $isSpoiled = $ethanol > 80 || $ammonia > 40 || $h2s > 15;
    return ['status' => $isSpoiled ? 'spoiled' : 'good', 'shelfLife' => $isSpoiled ? 0 : rand(14, 50), 'confidence' => 0.75];
}
