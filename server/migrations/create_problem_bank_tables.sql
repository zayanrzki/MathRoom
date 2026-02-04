-- Math Room Database - Problem Bank System Migration
-- Create tables for dynamic math problem generation and tracking

-- Table 1: Problem Templates (Pre-made generators)
CREATE TABLE IF NOT EXISTS problem_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic VARCHAR(100) NOT NULL,
    difficulty ENUM('Easy', 'Medium', 'Hard', 'Expert') NOT NULL,
    problem_type ENUM('template', 'ai_generated') DEFAULT 'template',
    template_function TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_topic_difficulty (topic, difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Session Problems (Generated problems for each session)
CREATE TABLE IF NOT EXISTS session_problems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT,
    room_code VARCHAR(10) NOT NULL,
    problem_number INT NOT NULL,
    topic VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_problem (room_code, problem_number),
    INDEX idx_room_code (room_code),
    INDEX idx_topic (topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: Student Answers (Track student responses)
CREATE TABLE IF NOT EXISTS student_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id INT NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    selected_answer CHAR(1) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scratch_canvas_data LONGTEXT,
    time_spent_seconds INT DEFAULT 0,
    UNIQUE KEY unique_answer (problem_id, student_email),
    FOREIGN KEY (problem_id) REFERENCES session_problems(id) ON DELETE CASCADE,
    INDEX idx_student_email (student_email),
    INDEX idx_problem_id (problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Show table structures
DESCRIBE problem_templates;
DESCRIBE session_problems;
DESCRIBE student_answers;

-- Show all tables
SHOW TABLES;
