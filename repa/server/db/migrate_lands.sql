-- Migration: Add missing columns to lands table
-- This adds the plot_number, city, ownership_type, status and updated_at columns if they don't exist

ALTER TABLE `lands` 
ADD COLUMN `plot_number` varchar(100) DEFAULT NULL AFTER `name`,
ADD COLUMN `city` varchar(255) DEFAULT NULL AFTER `area`,
ADD COLUMN `ownership_type` enum('owned', 'rented') DEFAULT 'owned' AFTER `location`,
ADD COLUMN `status` varchar(100) DEFAULT NULL AFTER `ownership_type`,
ADD COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;
