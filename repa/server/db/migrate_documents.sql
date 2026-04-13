-- Migration: Fix documents table schema
-- Add missing columns and rename existing ones

-- Rename existing columns and add new ones
ALTER TABLE `documents` 
CHANGE COLUMN `name` `title` varchar(255) NOT NULL,
CHANGE COLUMN `file_path` `filepath` varchar(500) NOT NULL,
ADD COLUMN `category` varchar(100) DEFAULT NULL AFTER `title`,
ADD COLUMN `filename` varchar(500) NOT NULL DEFAULT 'unknown' AFTER `category`,
ADD COLUMN `file_size` int(11) DEFAULT NULL AFTER `file_type`,
ADD COLUMN `mime_type` varchar(100) DEFAULT NULL AFTER `file_size`,
ADD COLUMN `entity_type` varchar(50) DEFAULT 'general' AFTER `mime_type`,
ADD COLUMN `entity_id` int(11) DEFAULT NULL AFTER `entity_type`,
ADD COLUMN `upload_date` timestamp DEFAULT CURRENT_TIMESTAMP AFTER `entity_id`,
ADD INDEX `idx_entity` (entity_type, entity_id),
ADD INDEX `idx_category` (category);
