# Inventory Management System
A full-stack inventory management application for managing products, stock levels, stock-in and stock-out transactions, transaction history, and low-stock alerts.

## Features
- Product catalog
- Add products
- Edit products
- Delete products
- Product SKU management
- Product categories
- Product pricing
- Configurable low-stock thresholds
- Stock-in transactions
- Stock-out transactions
- Transaction history
- Current stock calculation
- Low-stock alerts
- Insufficient-stock validation
- REST API
- SQLite persistence
- Responsive dashboard

## Technology Stack

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- SQLite
- REST API

## Database Design

The application uses two main tables:

### Products

Stores product information:

- id
- name
- sku
- category
- price
- low_stock_threshold
- created_at

### Transactions

Stores every stock movement:

- id
- product_id
- type
- quantity
- note
- created_at

The transaction table references the product using a foreign key.

## Stock Calculation

Stock is calculated from transaction records instead of directly editing a stored stock value.

For example:

```text
Stock In:  +20
Stock Out: -4
Stock Out: -3
----------------
Current:    13
```

This provides a history of stock changes.


## Low Stock Alerts
- Each product has a configurable low-stock threshold.

- When:
Current Stock <= Low Stock Threshold

- the product is marked as low stock and the dashboard displays an alert.


## Validation

The API validates:

1. Required product fields
2. Unique SKU
3. Non-negative product price
4. Valid stock quantities
5. Valid transaction types
6. Existing product IDs
7. Stock-out quantities against available stock

A stock-out transaction cannot reduce inventory below zero.



## API Endpoints
1. Products
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

2. Transactions
GET  /api/transactions
POST /api/transactions

3. Dashboard
GET /api/dashboard


## Installation
Clone the repository and install dependencies:
- npm install


## Run Locally
npm start

- Open:
http://localhost:3000



## Limitations
This project is designed as an internship demonstration application.

It does not currently include:
1. Authentication
2. Multiple warehouse locations
3. User roles
4. Barcode scanning
5. Supplier management
6. Real-time notifications

These features could be added in future versions.

