<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'latest';
    $batchId = $_GET['batch_id'] ?? null;
    
    if ($action === 'latest') {
        $sql = 'SELECT ethanol, ammonia, h2s, status, predicted_shelf_life as shelfLife, created_at as timestamp 
                FROM sensor_readings ORDER BY created_at DESC LIMIT 1';
        if ($batchId) {
            $sql = 'SELECT ethanol, ammonia, h2s, status, predicted_shelf_life as shelfLife, created_at as timestamp 
                    FROM sensor_readings WHERE batch_id = ? ORDER BY created_at DESC LIMIT 1';
        }
        $stmt = $batchId ? $pdo->prepare($sql) : $pdo->query($sql);
        if ($batchId) $stmt->execute([$batchId]);
        $data = $stmt->fetch();
        echo json_encode(['success' => true, 'data' => $data ?: null]);
    } else if ($action === 'history') {
        $limit = intval($_GET['limit'] ?? 100);
        $stmt = $pdo->prepare('SELECT ethanol, ammonia, h2s, status, predicted_shelf_life, created_at as timestamp 
                               FROM sensor_readings WHERE batch_id = ? ORDER BY created_at DESC LIMIT ?');
        $stmt->execute([$batchId, $limit]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    }
} else if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $batchId = $input['batch_id'] ?? 'DEFAULT';
    $ethanol = floatval($input['ethanol'] ?? 0);
    $ammonia = floatval($input['ammonia'] ?? 0);
    $h2s = floatval($input['h2s'] ?? 0);
    
    // Call Flask ML server for prediction
    $prediction = callMlServer($ethanol, $ammonia, $h2s);
    
    $stmt = $pdo->prepare('INSERT INTO sensor_readings (batch_id, ethanol, ammonia, h2s, status, predicted_shelf_life) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$batchId, $ethanol, $ammonia, $h2s, $prediction['status'], $prediction['shelfLife']]);
    
    echo json_encode(['success' => true, 'data' => $prediction]);
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
    
    // Fallback prediction if ML server unavailable
    $isSpoiled = $ethanol > 200 || $ammonia > 30 || $h2s > 10;
    return ['status' => $isSpoiled ? 'spoiled' : 'good', 'shelfLife' => $isSpoiled ? 0 : rand(2, 7), 'confidence' => 0.75];
}
