-- LACTRON Database Schema
CREATE DATABASE IF NOT EXISTS lactron_db;
USE lactron_db;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batches table
CREATE TABLE batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    collection_site VARCHAR(100),
    status ENUM('good', 'spoiled') DEFAULT 'good',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sensor readings table
CREATE TABLE sensor_readings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50),
    ethanol DECIMAL(10,2) NOT NULL,
    ammonia DECIMAL(10,2) NOT NULL,
    h2s DECIMAL(10,2) NOT NULL,
    status ENUM('good', 'spoiled') DEFAULT 'good',
    predicted_shelf_life INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch (batch_id),
    INDEX idx_created (created_at)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password, name) VALUES 
('admin@lactron.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User');

-- Insert sample batch
INSERT INTO batches (batch_id, collection_site) VALUES ('LCT-2024-001', 'Farm Station A');
