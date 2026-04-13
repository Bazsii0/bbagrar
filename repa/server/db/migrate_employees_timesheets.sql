-- Alkalmazottak tábla
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255) DEFAULT NULL,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  phone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  hire_date DATE DEFAULT NULL,
  status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Munkaidő nyilvántartás tábla
CREATE TABLE IF NOT EXISTS timesheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  work_date DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  total_pay DECIMAL(10,2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
  description TEXT DEFAULT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
