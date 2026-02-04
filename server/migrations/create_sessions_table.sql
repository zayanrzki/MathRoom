-- Math Room Database - Sessions Table Migration
-- Create sessions table to track classroom sessions

CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_code VARCHAR(10) NOT NULL UNIQUE,
    teacher_email VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    topic VARCHAR(255) DEFAULT '',
    difficulty VARCHAR(50) DEFAULT 'Medium',
    max_students INT DEFAULT 30,
    total_students INT DEFAULT 0,
    status ENUM('active', 'ended') DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    duration_minutes INT DEFAULT 0,
    INDEX idx_teacher_email (teacher_email),
    INDEX idx_room_code (room_code),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Show table structure
DESCRIBE sessions;

-- Show all tables
SHOW TABLES;
