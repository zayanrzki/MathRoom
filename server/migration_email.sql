-- Migration: Update student_notes table to use email instead of username
-- This ensures unique user identification

-- Add new columns
ALTER TABLE student_notes 
  ADD COLUMN student_email VARCHAR(255) AFTER student_name,
  ADD COLUMN student_display_name VARCHAR(255) AFTER student_email;

-- Copy existing data (if any)
UPDATE student_notes SET 
  student_email = CONCAT(LOWER(REPLACE(student_name, ' ', '')), '@temp.com'),
  student_display_name = student_name;

-- Remove old column and set constraints
ALTER TABLE student_notes 
  DROP COLUMN student_name,
  MODIFY COLUMN student_email VARCHAR(255) NOT NULL,
  ADD INDEX idx_student_email (student_email);
