-- Database schema for nodejs-whisper

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS whisper_nodejs;
USE whisper_nodejs;

-- Table for storing upload history
CREATE TABLE IF NOT EXISTS upload_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL COMMENT 'Upload type: file or youtube',
    name VARCHAR(255) NOT NULL COMMENT 'Original filename or YouTube URL',
    txt_link VARCHAR(255) COMMENT 'Relative path to TXT transcript',
    srt_link VARCHAR(255) COMMENT 'Relative path to SRT transcript',
    fcpxml_link VARCHAR(255) COMMENT 'Relative path to FCPXML transcript',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
