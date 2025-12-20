<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
session_start();

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$pdo = getConnection();

switch ($action) {
    case 'login':
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        
        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Email and password are required']);
            break;
        }
        
        $stmt = $pdo->prepare('SELECT id, email, name, password FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            unset($user['password']);
            echo json_encode(['success' => true, 'data' => $user]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No account matches with these details.']);
        }
        break;

    case 'signup':
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $name = trim($input['name'] ?? '');
        $securityQuestionId = intval($input['security_question_id'] ?? 0);
        $securityAnswer = $input['security_answer'] ?? ''; // Case-sensitive, stored as-is
        
        if (empty($email) || empty($password) || empty($name)) {
            echo json_encode(['success' => false, 'error' => 'All fields are required']);
            break;
        }
        
        if ($securityQuestionId <= 0 || empty($securityAnswer)) {
            echo json_encode(['success' => false, 'error' => 'Security question and answer are required']);
            break;
        }
        
        // Check if email already exists
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Email already exists']);
            break;
        }
        
        // Verify security question exists
        $stmt = $pdo->prepare('SELECT id FROM security_questions WHERE id = ?');
        $stmt->execute([$securityQuestionId]);
        if (!$stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Invalid security question']);
            break;
        }
        
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (email, password, name, security_question_id, security_answer) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$email, $hash, $name, $securityQuestionId, $securityAnswer]);
        
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

    case 'get_security_questions':
        $stmt = $pdo->query('SELECT id, question FROM security_questions ORDER BY id');
        $questions = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $questions]);
        break;

    case 'get_user_security_question':
        $email = trim($input['email'] ?? '');
        
        if (empty($email)) {
            echo json_encode(['success' => false, 'error' => 'Email is required']);
            break;
        }
        
        $stmt = $pdo->prepare('
            SELECT u.id, sq.question 
            FROM users u 
            JOIN security_questions sq ON u.security_question_id = sq.id 
            WHERE u.email = ?
        ');
        $stmt->execute([$email]);
        $result = $stmt->fetch();
        
        if ($result) {
            echo json_encode(['success' => true, 'data' => ['user_id' => $result['id'], 'question' => $result['question']]]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No account matches with these details.']);
        }
        break;

    case 'verify_security_answer':
        $email = trim($input['email'] ?? '');
        $answer = $input['answer'] ?? ''; // Case-sensitive comparison
        
        if (empty($email) || empty($answer)) {
            echo json_encode(['success' => false, 'error' => 'Email and answer are required']);
            break;
        }
        
        $stmt = $pdo->prepare('SELECT id, security_answer FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && $user['security_answer'] === $answer) { // Exact case-sensitive match
            // Generate a temporary reset token
            $resetToken = bin2hex(random_bytes(32));
            $_SESSION['reset_token'] = $resetToken;
            $_SESSION['reset_user_id'] = $user['id'];
            $_SESSION['reset_expires'] = time() + 600; // 10 minutes
            
            echo json_encode(['success' => true, 'data' => ['reset_token' => $resetToken]]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Security answer does not match. Remember, the answer is case-sensitive.']);
        }
        break;

    case 'reset_password':
        $resetToken = $input['reset_token'] ?? '';
        $newPassword = $input['new_password'] ?? '';
        
        if (empty($resetToken) || empty($newPassword)) {
            echo json_encode(['success' => false, 'error' => 'Token and new password are required']);
            break;
        }
        
        if (!isset($_SESSION['reset_token']) || 
            $_SESSION['reset_token'] !== $resetToken ||
            !isset($_SESSION['reset_expires']) ||
            time() > $_SESSION['reset_expires']) {
            echo json_encode(['success' => false, 'error' => 'Invalid or expired reset token']);
            break;
        }
        
        $userId = $_SESSION['reset_user_id'];
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
        $stmt->execute([$hash, $userId]);
        
        // Clear reset session data
        unset($_SESSION['reset_token']);
        unset($_SESSION['reset_user_id']);
        unset($_SESSION['reset_expires']);
        
        echo json_encode(['success' => true, 'message' => 'Password updated successfully']);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}
