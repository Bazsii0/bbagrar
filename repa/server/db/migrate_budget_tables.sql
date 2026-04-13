-- Migration: Fix incomes, expenses, clients tables
-- Add missing columns and fix constraints

ALTER TABLE `incomes` 
ADD COLUMN `category` varchar(100) DEFAULT NULL AFTER `income_date`;

ALTER TABLE `expenses` 
MODIFY COLUMN `description` varchar(255) DEFAULT NULL;

ALTER TABLE `clients` 
ADD COLUMN `company_name` varchar(255) DEFAULT NULL AFTER `name`;
