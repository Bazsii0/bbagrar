-- Marketplace images table for multiple images per listing
CREATE TABLE IF NOT EXISTS `marketplace_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `marketplace_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `sort_order` int DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  FOREIGN KEY (marketplace_id) REFERENCES marketplace(id) ON DELETE CASCADE,
  INDEX idx_marketplace_id (marketplace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Migrate existing image_url data to the new images table
INSERT INTO marketplace_images (marketplace_id, image_url, sort_order)
SELECT id, image_url, 0 FROM marketplace WHERE image_url IS NOT NULL AND image_url != '';
