-- Modern Agrar Database Schema
-- Fresh initialization without legacy tables

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Create database
CREATE DATABASE IF NOT EXISTS `bbagrar` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `bbagrar`;

-- ================================================
-- Users table
-- ================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` varchar(50) NOT NULL UNIQUE,
  `email` varchar(255) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'owner',
  `phone` varchar(20) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default users
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `role`, `created_at`) VALUES
(2, 'barni', 'nagybarni@gmail.com', '$2a$10$Z7BAcLARoDSfaAQfDQgXPOgrXsTPhjAEU77Djoi/o82F2AnXq0FvO', 'owner', '2026-02-03 09:57:58'),
(4, 'savanyo', 'savanyo.balazs0@gmail.com', '$2a$10$AOYGcgDcMoGt3rCwwW.F9O8a7oPHAYfOZ2v92Lb4drB4cvqy1zWRi', 'owner', '2026-02-10 09:09:41');

-- ================================================
-- Animals table
-- ================================================
CREATE TABLE IF NOT EXISTS `animals` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `species` varchar(100) NOT NULL,
  `breed` varchar(100) DEFAULT NULL,
  `identifier` varchar(100) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `stable` varchar(100) DEFAULT NULL,
  `gender` enum('hím','nőstény','ismeretlen','herélt') DEFAULT 'ismeretlen',
  `purpose` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `dam_id` int(11) DEFAULT NULL,
  `sire_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (dam_id) REFERENCES animals(id) ON DELETE SET NULL,
  FOREIGN KEY (sire_id) REFERENCES animals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- Clients table
-- ================================================
CREATE TABLE IF NOT EXISTS `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `tax_number` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Magyarország',
  `contact_person` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `last_contact` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- Documents table
-- ================================================
CREATE TABLE IF NOT EXISTS `documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `filename` varchar(500) NOT NULL,
  `filepath` varchar(500) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `entity_type` varchar(50) DEFAULT 'general',
  `entity_id` int(11) DEFAULT NULL,
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- Notifications table
-- ================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `data` json DEFAULT NULL,
  `is_read` boolean DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- Notification settings table
-- ================================================
CREATE TABLE IF NOT EXISTS `notification_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL UNIQUE,
  `email_notifications` boolean DEFAULT true,
  `browser_notifications` boolean DEFAULT true,
  `event_reminders` boolean DEFAULT true,
  `marketplace_alerts` boolean DEFAULT true,
  `system_updates` boolean DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- Calendar events table
-- ================================================
CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `event_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `event_type` varchar(50) DEFAULT 'task',
  `priority` varchar(20) DEFAULT 'medium',
  `status` varchar(20) DEFAULT 'pending',
  `location` varchar(255) DEFAULT NULL,
  `animal_id` int(11) DEFAULT NULL,
  `recurring_type` varchar(20) DEFAULT 'none',
  `recurring_interval` int(11) DEFAULT 1,
  `recurring_end_date` date DEFAULT NULL,
  `reminder_before` int(11) DEFAULT 60,
  `color` varchar(50) DEFAULT NULL,
  `reminder_days` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE SET NULL,
  INDEX idx_user_date (user_id, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================ 
-- Expenses table
-- ================================================
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `amount` decimal(10, 2) NOT NULL,
  `expense_date` date NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- Incomes table
-- ================================================
CREATE TABLE IF NOT EXISTS `incomes` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `amount` decimal(10, 2) NOT NULL,
  `income_date` date NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- Lands table
-- ================================================
CREATE TABLE IF NOT EXISTS `lands` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `plot_number` varchar(100) DEFAULT NULL,
  `area` decimal(10, 2) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `location` text DEFAULT NULL,
  `ownership_type` enum('owned', 'rented') DEFAULT 'owned',
  `status` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- ================================================
-- Marketplace items table
-- ================================================
CREATE TABLE IF NOT EXISTS `marketplace` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `price` decimal(10, 2) NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `status` enum('active', 'sold', 'pending', 'inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================
-- Marketplace images table (multiple images per listing)
-- ================================================
CREATE TABLE IF NOT EXISTS `marketplace_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `marketplace_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `sort_order` int DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  FOREIGN KEY (marketplace_id) REFERENCES marketplace(id) ON DELETE CASCADE,
  INDEX idx_marketplace_id (marketplace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
