const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'online_pharmacy'
  });
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const customerHash = await bcrypt.hash('Customer@123', 10);

  await db.execute(
    `INSERT INTO Users (name,email,password,phone,role) VALUES
     (?,?,?,?,?),(?,?,?,?,?)
     ON DUPLICATE KEY UPDATE password=VALUES(password), role=VALUES(role)`,
    [
      'Pharmacy Admin','admin@pharmacy.com',adminHash,'9876543210','admin',
      'Demo Customer','customer@example.com',customerHash,'9876501234','customer'
    ]
  );
  console.log('Demo accounts created/updated.');
  console.log('Admin: admin@pharmacy.com / Admin@123');
  console.log('Customer: customer@example.com / Customer@123');
  await db.end();
})().catch(err => { console.error(err); process.exit(1); });
