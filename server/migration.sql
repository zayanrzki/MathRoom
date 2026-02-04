-- Migration: Create student_notes table
-- This table stores canvas drawings/notes from students

CREATE TABLE IF NOT EXISTS student_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    room_code VARCHAR(10) NOT NULL,
    title VARCHAR(255) DEFAULT 'Untitled Note',
    canvas_data LONGTEXT NOT NULL,
    thumbnail MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_name (student_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
