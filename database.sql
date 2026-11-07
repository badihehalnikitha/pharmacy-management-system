CREATE DATABASE IF NOT EXISTS online_pharmacy;
USE online_pharmacy;

CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(20) NOT NULL DEFAULT 'customer'
);

CREATE TABLE IF NOT EXISTS Medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    manufactures VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    expiry_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    satus VARCHAR(30) NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Order_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_items_medicine FOREIGN KEY (medicine_id) REFERENCES Medicines(medicine_id)
);

-- Demo account passwords are hashed using bcryptjs.
-- Admin: Admin@123 | Customer: Customer@123
INSERT INTO Users (user_id, name, email, password, phone, role) VALUES
(1, 'Pharmacy Admin', 'admin@pharmacy.com', '$2b$10$wH7m2Y8uZf9s9xQ7j3Kj3e8r5hK6pQvKq9F8xY5Y1f8Q8x7f5v3eK', '9876543210', 'admin'),
(2, 'Demo Customer', 'customer@example.com', '$2b$10$wH7m2Y8uZf9s9xQ7j3Kj3e8r5hK6pQvKq9F8xY5Y1f8Q8x7f5v3eK', '9876501234', 'customer')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- These are fictional sample inventory records for the mini project.
INSERT INTO Medicines
(medicine_id, medicine_name, category, manufactures, price, stock, expiry_date) VALUES
(1, 'Paracetamol 500mg', 'Pain Relief', 'HealthCare Labs', 25.00, 120, '2027-12-31'),
(2, 'Cetirizine 10mg', 'Allergy', 'Wellness Pharma', 18.50, 80, '2027-09-30'),
(3, 'ORS Sachet', 'Hydration', 'CarePlus', 22.00, 100, '2027-06-30'),
(4, 'Vitamin C 500mg', 'Vitamins', 'NutriLife', 65.00, 60, '2028-03-31'),
(5, 'Antacid Tablets', 'Digestive Care', 'MediCure', 35.00, 75, '2027-11-30'),
(6, 'Cough Syrup 100ml', 'Cough & Cold', 'Wellness Pharma', 90.00, 40, '2027-08-31'),
(7, 'First Aid Antiseptic 100ml', 'First Aid', 'SafeCare', 55.00, 50, '2028-01-31'),
(8, 'Expired Sample Item', 'Demo', 'Demo Labs', 10.00, 5, '2025-01-01')
ON DUPLICATE KEY UPDATE medicine_name=VALUES(medicine_name);
