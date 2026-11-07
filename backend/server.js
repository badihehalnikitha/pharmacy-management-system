const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 4 }
}));
app.use(express.static(__dirname));

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: 'Please log in first.' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}
const safeUser = u => ({ user_id: u.user_id, name: u.name, email: u.email, phone: u.phone, role: u.role });

app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO Users (name,email,password,phone,role) VALUES (?,?,?,?,?)',
      [name.trim(), email.trim().toLowerCase(), hash, phone || '', 'customer']
    );
    const [rows] = await db.execute('SELECT * FROM Users WHERE user_id=?', [result.insertId]);
    req.session.user = safeUser(rows[0]);
    res.status(201).json({ message: 'Account created successfully.', user: req.session.user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This email is already registered.' });
    console.error(err); res.status(500).json({ message: 'Could not create account.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.execute('SELECT * FROM Users WHERE email=?', [(email || '').trim().toLowerCase()]);
    if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    req.session.user = safeUser(rows[0]);
    res.json({ message: 'Login successful.', user: req.session.user });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Login failed.' }); }
});

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ message: 'Logged out.' })));

app.get('/api/medicines', async (req, res) => {
  try {
    const q = `%${(req.query.q || '').trim()}%`;
    const [rows] = await db.execute(
      `SELECT medicine_id, medicine_name, category, manufactures, price, stock, expiry_date
       FROM Medicines
       WHERE medicine_name LIKE ? OR category LIKE ?
       ORDER BY medicine_name`, [q, q]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Could not load medicines.' }); }
});

app.post('/api/orders', requireLogin, async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Your cart is empty.' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let total = 0;
    const validated = [];
    for (const item of items) {
      const id = Number(item.medicine_id), qty = Number(item.quantity);
      if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1) throw new Error('Invalid cart item.');
      const [rows] = await conn.execute('SELECT * FROM Medicines WHERE medicine_id=? FOR UPDATE', [id]);
      if (!rows.length) throw new Error('A selected medicine was not found.');
      const med = rows[0];
      if (new Date(med.expiry_date) < new Date(new Date().toISOString().slice(0,10))) throw new Error(`${med.medicine_name} has expired and cannot be ordered.`);
      if (med.stock < qty) throw new Error(`Only ${med.stock} unit(s) of ${med.medicine_name} are available.`);
      total += Number(med.price) * qty;
      validated.push({ med, qty });
    }
    const [order] = await conn.execute(
      'INSERT INTO Orders (user_id, order_date, total_amount, satus) VALUES (?, CURDATE(), ?, ?)',
      [req.session.user.user_id, total.toFixed(2), 'Pending']
    );
    for (const x of validated) {
      await conn.execute(
        'INSERT INTO Order_items (order_id, medicine_id, quantity, price) VALUES (?,?,?,?)',
        [order.insertId, x.med.medicine_id, x.qty, x.med.price]
      );
      await conn.execute('UPDATE Medicines SET stock=stock-? WHERE medicine_id=?', [x.qty, x.med.medicine_id]);
    }
    await conn.commit();
    res.status(201).json({ message: 'Order placed successfully.', order_id: order.insertId, total_amount: total.toFixed(2) });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message || 'Could not place order.' });
  } finally { conn.release(); }
});

app.get('/api/orders', requireLogin, async (req, res) => {
  try {
    const isAdmin = req.session.user.role === 'admin';
    const sql = `SELECT o.order_id,o.user_id,u.name AS customer_name,o.order_date,o.total_amount,o.satus,
      GROUP_CONCAT(CONCAT(m.medicine_name,' × ',oi.quantity) SEPARATOR ', ') AS items
      FROM Orders o JOIN Users u ON u.user_id=o.user_id
      JOIN Order_items oi ON oi.order_id=o.order_id JOIN Medicines m ON m.medicine_id=oi.medicine_id
      ${isAdmin ? '' : 'WHERE o.user_id=?'}
      GROUP BY o.order_id ORDER BY o.order_id DESC`;
    const [rows] = await db.execute(sql, isAdmin ? [] : [req.session.user.user_id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Could not load orders.' }); }
});

app.post('/api/medicines', requireAdmin, async (req, res) => {
  try {
    const { medicine_name, category, manufactures, price, stock, expiry_date } = req.body;
    if (!medicine_name || !expiry_date || Number(price) < 0 || Number(stock) < 0) return res.status(400).json({ message: 'Enter valid medicine details.' });
    const [r] = await db.execute(
      'INSERT INTO Medicines (medicine_name,category,manufactures,price,stock,expiry_date) VALUES (?,?,?,?,?,?)',
      [medicine_name, category || '', manufactures || '', Number(price), Number(stock), expiry_date]
    );
    res.status(201).json({ message: 'Medicine added.', medicine_id: r.insertId });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Could not add medicine.' }); }
});

app.put('/api/medicines/:id', requireAdmin, async (req, res) => {
  try {
    const { medicine_name, category, manufactures, price, stock, expiry_date } = req.body;
    await db.execute(
      'UPDATE Medicines SET medicine_name=?,category=?,manufactures=?,price=?,stock=?,expiry_date=? WHERE medicine_id=?',
      [medicine_name, category || '', manufactures || '', Number(price), Number(stock), expiry_date, req.params.id]
    );
    res.json({ message: 'Medicine updated.' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Could not update medicine.' }); }
});

app.delete('/api/medicines/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM Medicines WHERE medicine_id=?', [req.params.id]);
    res.json({ message: 'Medicine deleted.' });
  } catch (err) { res.status(409).json({ message: 'Cannot delete a medicine already used in an order.' }); }
});

app.patch('/api/orders/:id/status', requireAdmin, async (req, res) => {
  const allowed = ['Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled'];
  if (!allowed.includes(req.body.satus)) return res.status(400).json({ message: 'Invalid order status.' });
  try {
    const [r] = await db.execute('UPDATE Orders SET satus=? WHERE order_id=?', [req.body.satus, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Order status updated.' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Could not update order status.' }); }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Online Pharmacy running at http://localhost:${PORT}`));
