-- Migration: Add missing columns to clients table
-- This adds all required columns for the clients management system

ALTER TABLE `clients` 
ADD COLUMN `tax_number` varchar(50) DEFAULT NULL AFTER `company_name`,
ADD COLUMN `city` varchar(255) DEFAULT NULL AFTER `address`,
ADD COLUMN `postal_code` varchar(20) DEFAULT NULL AFTER `city`,
ADD COLUMN `country` varchar(100) DEFAULT 'Magyarország' AFTER `postal_code`,
ADD COLUMN `contact_person` varchar(255) DEFAULT NULL AFTER `country`,
ADD COLUMN `website` varchar(255) DEFAULT NULL AFTER `contact_person`,
ADD COLUMN `type` varchar(50) DEFAULT NULL AFTER `website`,
ADD COLUMN `payment_terms` varchar(100) DEFAULT NULL AFTER `type`,
ADD COLUMN `status` varchar(50) DEFAULT 'active' AFTER `payment_terms`,
ADD COLUMN `notes` text DEFAULT NULL AFTER `status`,
ADD COLUMN `last_contact` date DEFAULT NULL AFTER `notes`,
ADD COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;
