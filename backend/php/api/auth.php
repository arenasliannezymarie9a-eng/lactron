<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
session_start();

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$pdo = getConnection();

switch ($action) {
    case 'login':
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        
        $stmt = $pdo->prepare('SELECT id, email, name, password FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            unset($user['password']);
            echo json_encode(['success' => true, 'data' => $user]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        }
        break;

    case 'signup':
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $name = $input['name'] ?? '';
        
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Email already exists']);
            break;
        }
        
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
        $stmt->execute([$email, $hash, $name]);
        
        $userId = $pdo->lastInsertId();
        $_SESSION['user_id'] = $userId;
        echo json_encode(['success' => true, 'data' => ['id' => $userId, 'email' => $email, 'name' => $name]]);
        break;

    case 'logout':
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    case 'check':
        if (isset($_SESSION['user_id'])) {
            $stmt = $pdo->prepare('SELECT id, email, name FROM users WHERE id = ?');
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            echo json_encode(['success' => true, 'data' => $user]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        }
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}
