<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'active') {
        // Get active or paused session for logged-in user
        session_start();
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'Not authenticated']);
            exit;
        }
        
        $stmt = $pdo->prepare("SELECT ds.*, 
            (SELECT COUNT(*) FROM sensor_readings WHERE batch_id = ds.batch_id) as reading_count
            FROM dataset_sessions ds 
            WHERE ds.user_id = ? AND ds.session_state IN ('active', 'paused') 
            ORDER BY ds.started_at DESC LIMIT 1");
        $stmt->execute([$userId]);
        $session = $stmt->fetch();
        
        if ($session) {
            $session['remaining_shelf_life'] = computeRemainingShelfLife($session);
        }
        
        echo json_encode(['success' => true, 'data' => $session ?: null]);
        
    } else if ($action === 'list') {
        session_start();
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'Not authenticated']);
            exit;
        }
        
        $stmt = $pdo->prepare("SELECT ds.*, 
            (SELECT COUNT(*) FROM sensor_readings WHERE batch_id = ds.batch_id) as reading_count
            FROM dataset_sessions ds 
            WHERE ds.user_id = ? 
            ORDER BY ds.started_at DESC");
        $stmt->execute([$userId]);
        $sessions = $stmt->fetchAll();
        
        foreach ($sessions as &$s) {
            $s['remaining_shelf_life'] = computeRemainingShelfLife($s);
        }
        
        echo json_encode(['success' => true, 'data' => $sessions]);
    }
    
} else if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    session_start();
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        exit;
    }
    
    try {
        if ($action === 'start') {
            $initialShelfLife = floatval($input['initial_shelf_life'] ?? 72);
            $initialShelfLife = max(1, min(72, $initialShelfLife));
            
            $batchId = 'DATASET-' . time();
            
            // Create batch row so ESP32 can sync
            $stmt = $pdo->prepare("INSERT INTO batches (batch_id, user_id, collector_name, collection_datetime, status) VALUES (?, ?, 'Dataset Collection', NOW(), 'good')");
            $stmt->execute([$batchId, $userId]);
            
            // Create dataset session
            $stmt = $pdo->prepare("INSERT INTO dataset_sessions (batch_id, user_id, initial_shelf_life) VALUES (?, ?, ?)");
            $stmt->execute([$batchId, $userId, $initialShelfLife]);
            
            $sessionId = $pdo->lastInsertId();
            $stmt = $pdo->prepare("SELECT ds.*, 0 as reading_count FROM dataset_sessions ds WHERE ds.id = ?");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch();
            $session['remaining_shelf_life'] = $initialShelfLife;
            
            echo json_encode(['success' => true, 'data' => $session]);
            
        } else if ($action === 'pause') {
            $batchId = $input['batch_id'] ?? '';
            $stmt = $pdo->prepare("UPDATE dataset_sessions SET session_state = 'paused', last_paused_at = NOW() WHERE batch_id = ? AND user_id = ? AND session_state = 'active'");
            $stmt->execute([$batchId, $userId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'No active session found']);
            }
            
        } else if ($action === 'resume') {
            $batchId = $input['batch_id'] ?? '';
            
            // Get the session to calculate pause duration
            $stmt = $pdo->prepare("SELECT * FROM dataset_sessions WHERE batch_id = ? AND user_id = ? AND session_state = 'paused'");
            $stmt->execute([$batchId, $userId]);
            $session = $stmt->fetch();
            
            if ($session && $session['last_paused_at']) {
                $pauseDuration = time() - strtotime($session['last_paused_at']);
                $newTotalPaused = intval($session['total_paused_seconds']) + $pauseDuration;
                
                $stmt = $pdo->prepare("UPDATE dataset_sessions SET session_state = 'active', total_paused_seconds = ?, last_paused_at = NULL WHERE batch_id = ? AND user_id = ?");
                $stmt->execute([$newTotalPaused, $batchId, $userId]);
                
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'No paused session found']);
            }
            
        } else if ($action === 'stop') {
            $batchId = $input['batch_id'] ?? '';
            
            // If paused, finalize pause duration first
            $stmt = $pdo->prepare("SELECT * FROM dataset_sessions WHERE batch_id = ? AND user_id = ? AND session_state IN ('active', 'paused')");
            $stmt->execute([$batchId, $userId]);
            $session = $stmt->fetch();
            
            if ($session) {
                $totalPaused = intval($session['total_paused_seconds']);
                if ($session['session_state'] === 'paused' && $session['last_paused_at']) {
                    $totalPaused += time() - strtotime($session['last_paused_at']);
                }
                
                $stmt = $pdo->prepare("UPDATE dataset_sessions SET session_state = 'stopped', stopped_at = NOW(), total_paused_seconds = ?, last_paused_at = NULL WHERE batch_id = ? AND user_id = ?");
                $stmt->execute([$totalPaused, $batchId, $userId]);
                
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'No active/paused session found']);
            }
            
        } else if ($action === 'update_status') {
            $batchId = $input['batch_id'] ?? '';
            $statusOverride = $input['status'] ?? 'good';
            
            if (!in_array($statusOverride, ['good', 'fair', 'spoiled'])) {
                echo json_encode(['success' => false, 'error' => 'Invalid status']);
                exit;
            }
            
            $stmt = $pdo->prepare("UPDATE dataset_sessions SET status_override = ? WHERE batch_id = ? AND user_id = ? AND session_state IN ('active', 'paused')");
            $stmt->execute([$statusOverride, $batchId, $userId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'No active/paused session found']);
            }
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function computeRemainingShelfLife($session) {
    $initialHours = floatval($session['initial_shelf_life']);
    $startedAt = strtotime($session['started_at'] . ' UTC');
    $totalPaused = intval($session['total_paused_seconds']);
    
    if ($session['session_state'] === 'stopped' && $session['stopped_at']) {
        $endTime = strtotime($session['stopped_at'] . ' UTC');
    } else if ($session['session_state'] === 'paused' && $session['last_paused_at']) {
        $endTime = strtotime($session['last_paused_at'] . ' UTC');
    } else {
        $endTime = time();
    }
    
    $effectiveElapsed = max(0, ($endTime - $startedAt) - $totalPaused);
    $remainingHours = $initialHours - ($effectiveElapsed / 3600);
    return min($initialHours, max(0, round($remainingHours, 2)));
}
