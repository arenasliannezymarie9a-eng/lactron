-- LACTRON Database Schema
-- Complete schema with batches linked to users, and sensor readings

CREATE DATABASE IF NOT EXISTS lactron;
USE lactron;

-- Security questions predefined list (for password recovery only)
CREATE TABLE security_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL
);

-- Insert predefined security questions
INSERT INTO security_questions (question) VALUES
('What is the name of your first pet?'),
('What is your mother''s maiden name?'),
('What was the name of your first school?'),
('What city were you born in?'),
('What is your favorite book?'),
('What was the make of your first car?'),
('What is the middle name of your oldest sibling?'),
('What street did you grow up on?'),
('What was your childhood nickname?'),
('What is the name of your favorite childhood friend?');

-- Users table (security question is optional, set during password recovery)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    security_question_id INT DEFAULT NULL,
    security_answer VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (security_question_id) REFERENCES security_questions(id)
);

-- Batches table linked to users
CREATE TABLE batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    collector_name VARCHAR(100) NOT NULL,
    collection_datetime DATETIME NOT NULL,
    status ENUM('good', 'spoiled') DEFAULT 'good',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_batch (batch_id)
);

-- Sensor readings table
CREATE TABLE sensor_readings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    ethanol DECIMAL(10,2) NOT NULL,
    ammonia DECIMAL(10,2) NOT NULL,
    h2s DECIMAL(10,2) NOT NULL,
    status ENUM('good', 'spoiled') DEFAULT 'good',
    predicted_shelf_life DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch (batch_id),
    INDEX idx_created (created_at)
);

-- Alerts table
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50),
    alert_type ENUM('warning', 'critical') NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch (batch_id)
);

-- System settings table
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Prediction logs for ML tracking
CREATE TABLE prediction_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50),
    ethanol DECIMAL(10,2),
    ammonia DECIMAL(10,2),
    h2s DECIMAL(10,2),
    predicted_status ENUM('good', 'spoiled'),
    predicted_shelf_life DECIMAL(10,2),
    model_confidence DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch (batch_id)
);

-- Batch history table for saved/archived batches
CREATE TABLE batch_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    collector_name VARCHAR(100) NOT NULL,
    collection_datetime DATETIME NOT NULL,
    ethanol DECIMAL(10,2) NOT NULL,
    ammonia DECIMAL(10,2) NOT NULL,
    h2s DECIMAL(10,2) NOT NULL,
    grade ENUM('GOOD', 'SPOILED') DEFAULT 'GOOD',
    shelf_life DECIMAL(10,2) DEFAULT 0,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_batch (batch_id)
);

-- Insert default thresholds
INSERT INTO system_settings (setting_key, setting_value) VALUES
('ethanol_threshold', '50'),
('ammonia_threshold', '40'),
('h2s_threshold', '60'),
('refresh_interval', '5000'),
('ml_server_url', 'http://localhost:5000');

-- View for latest batch readings
CREATE VIEW latest_batch_readings AS
SELECT 
    b.batch_id,
    b.collector_name,
    b.collection_datetime,
    b.status as batch_status,
    sr.ethanol,
    sr.ammonia,
    sr.h2s,
    sr.status as reading_status,
    sr.predicted_shelf_life,
    sr.created_at as reading_time
FROM batches b
LEFT JOIN sensor_readings sr ON b.batch_id = sr.batch_id
WHERE sr.id = (
    SELECT MAX(id) FROM sensor_readings WHERE batch_id = b.batch_id
) OR sr.id IS NULL;

-- Stored procedure for batch summary
DELIMITER //
CREATE PROCEDURE GetBatchSummary(IN p_batch_id VARCHAR(50))
BEGIN
    SELECT 
        b.*,
        COUNT(sr.id) as total_readings,
        AVG(sr.ethanol) as avg_ethanol,
        AVG(sr.ammonia) as avg_ammonia,
        AVG(sr.h2s) as avg_h2s,
        MAX(sr.created_at) as last_reading_time
    FROM batches b
    LEFT JOIN sensor_readings sr ON b.batch_id = sr.batch_id
    WHERE b.batch_id = p_batch_id
    GROUP BY b.id;
END //
DELIMITER ;
