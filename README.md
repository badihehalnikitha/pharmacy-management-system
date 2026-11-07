# Online Pharmacy Management System

A mini project built with **HTML, CSS, JavaScript, Node.js, Express.js and MySQL**.

## Features

### Customer
- Register and log in
- Browse/search medicines by name or category
- View price, available stock and expiry date
- Add medicines to a cart and place an order
- View personal order history and order status

### Admin
- Log in using the seeded admin account
- Add, edit and delete medicines
- Maintain stock and expiry dates
- View all customer orders and update order status

## Requirements
- Node.js (18 or later)
- MySQL Server / MySQL Workbench
- A web browser

## 1. Create the database and tables

1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `database.sql`.
3. Execute the complete script. It creates the `online_pharmacy` database, all four tables and sample data.

The table names and columns follow the specification. The supplied spellings `manufactures` and `satus` are retained so the SQL matches the given table design.

## 2. Configure the backend

Open a terminal in the `backend` folder and run:

```bash
npm install
```

Copy `.env.example` to `.env` and set your MySQL details:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=online_pharmacy
SESSION_SECRET=replace_this_with_a_long_random_secret
```

Do not put `.env` or real passwords on GitHub.

After creating `.env`, run this once from the `backend` folder to create valid hashed demo passwords:

```bash
node seed-demo-users.js
```

## 3. Start the project

From the `backend` folder:

```bash
npm start
```

Open this address in your browser:

`http://localhost:5000`

The Express server serves the frontend from the `public` folder, so you do not need to open `index.html` directly.

## Demo accounts

- Admin: `admin@pharmacy.com` / `Admin@123`
- Customer: `customer@example.com` / `Customer@123`

Change demo passwords before using this project beyond a classroom demonstration.

## Database tables

- `Users`: customer/admin accounts
- `Medicines`: medicine details, price, stock and expiry date
- `Orders`: order header, customer, date, total and status
- `Order_items`: medicines and quantities in each order

## Project structure

```text
online_pharmacy_management/
├── database.sql
├── README.md
└── backend/
    ├── .env.example
    ├── package.json
    ├── server.js
    ├── db.js
    ├── seed-demo-users.js
    └── public/
        ├── index.html
        ├── style.css
        └── app.js
```

## Notes
- Passwords are hashed with `bcryptjs`.
- Customer orders are saved in `Orders` and `Order_items` within a database transaction.
- Stock is checked and reduced when an order is placed.
- Medicines that have expired or have no stock cannot be ordered.
- This is an academic demonstration. Do not use it to dispense prescription medicines or process real payments without appropriate legal, security and clinical review.


## Contact page
The Shop navigation includes a Contact page with the project contact details. Update the phone placeholder in `backend/public/index.html` with your actual phone number before publishing.
