DROP TABLE IF EXISTS marketplace_items;
DROP TABLE IF EXISTS marketplace;

CREATE TABLE IF NOT EXISTS marketplace (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id int(11) NOT NULL,
  title varchar(255) NOT NULL,
  description text DEFAULT NULL,
  type varchar(100) DEFAULT NULL,
  price decimal(10, 2) NOT NULL,
  image_url varchar(500) DEFAULT NULL,
  location varchar(255) DEFAULT NULL,
  contact_name varchar(255) DEFAULT NULL,
  contact_phone varchar(20) DEFAULT NULL,
  contact_email varchar(255) DEFAULT NULL,
  status enum('aktív', 'eladva', 'függőben', 'inaktív') DEFAULT 'aktív',
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
