const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./inventory.db");


// ======================================================
// DATABASE SETUP
// ======================================================

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            price REAL NOT NULL DEFAULT 0,
            low_stock_threshold INTEGER NOT NULL DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
            quantity INTEGER NOT NULL CHECK(quantity > 0),
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    `);

});


// ======================================================
// HELPER
// ======================================================

function calculateStock(productId, callback) {

    db.get(
        `
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN type = 'IN' THEN quantity
                        WHEN type = 'OUT' THEN -quantity
                    END
                ),
                0
            ) AS stock
        FROM transactions
        WHERE product_id = ?
        `,
        [productId],
        (err, row) => {

            if (err) {
                callback(err);
                return;
            }

            callback(null, row.stock || 0);
        }
    );
}


// ======================================================
// PRODUCTS
// ======================================================

// GET all products
app.get("/api/products", (req, res) => {

    const query = `
        SELECT
            p.id,
            p.name,
            p.sku,
            p.category,
            p.price,
            p.low_stock_threshold,
            COALESCE(
                SUM(
                    CASE
                        WHEN t.type = 'IN' THEN t.quantity
                        WHEN t.type = 'OUT' THEN -t.quantity
                    END
                ),
                0
            ) AS stock
        FROM products p
        LEFT JOIN transactions t
            ON p.id = t.product_id
        GROUP BY p.id
        ORDER BY p.id DESC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Failed to fetch products"
            });
        }

        res.json(rows);
    });
});


// GET one product
app.get("/api/products/:id", (req, res) => {

    db.get(
        `SELECT * FROM products WHERE id = ?`,
        [req.params.id],
        (err, product) => {

            if (err) {
                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (!product) {
                return res.status(404).json({
                    error: "Product not found"
                });
            }

            calculateStock(
                product.id,
                (stockErr, stock) => {

                    if (stockErr) {
                        return res.status(500).json({
                            error: "Failed to calculate stock"
                        });
                    }

                    product.stock = stock;

                    res.json(product);
                }
            );
        }
    );
});


// CREATE product
app.post("/api/products", (req, res) => {

    const {
        name,
        sku,
        category,
        price,
        low_stock_threshold
    } = req.body;

    if (
        !name ||
        !sku ||
        !category ||
        price === undefined ||
        low_stock_threshold === undefined
    ) {
        return res.status(400).json({
            error: "All product fields are required"
        });
    }

    if (Number(price) < 0) {
        return res.status(400).json({
            error: "Price cannot be negative"
        });
    }

    if (
        !Number.isInteger(Number(low_stock_threshold)) ||
        Number(low_stock_threshold) < 0
    ) {
        return res.status(400).json({
            error: "Invalid low-stock threshold"
        });
    }

    db.run(
        `
        INSERT INTO products
        (name, sku, category, price, low_stock_threshold)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            name.trim(),
            sku.trim(),
            category.trim(),
            Number(price),
            Number(low_stock_threshold)
        ],
        function (err) {

            if (err) {

                if (err.message.includes("UNIQUE")) {
                    return res.status(409).json({
                        error: "SKU already exists"
                    });
                }

                console.error(err);

                return res.status(500).json({
                    error: "Failed to create product"
                });
            }

            res.status(201).json({
                message: "Product created successfully",
                id: this.lastID
            });
        }
    );
});


// UPDATE product
app.put("/api/products/:id", (req, res) => {

    const {
        name,
        sku,
        category,
        price,
        low_stock_threshold
    } = req.body;

    if (
        !name ||
        !sku ||
        !category ||
        price === undefined ||
        low_stock_threshold === undefined
    ) {
        return res.status(400).json({
            error: "All product fields are required"
        });
    }

    db.run(
        `
        UPDATE products
        SET
            name = ?,
            sku = ?,
            category = ?,
            price = ?,
            low_stock_threshold = ?
        WHERE id = ?
        `,
        [
            name.trim(),
            sku.trim(),
            category.trim(),
            Number(price),
            Number(low_stock_threshold),
            req.params.id
        ],
        function (err) {

            if (err) {

                if (err.message.includes("UNIQUE")) {
                    return res.status(409).json({
                        error: "SKU already exists"
                    });
                }

                return res.status(500).json({
                    error: "Failed to update product"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Product not found"
                });
            }

            res.json({
                message: "Product updated successfully"
            });
        }
    );
});


// DELETE product
app.delete("/api/products/:id", (req, res) => {

    db.get(
        `SELECT id FROM products WHERE id = ?`,
        [req.params.id],
        (err, product) => {

            if (err) {
                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (!product) {
                return res.status(404).json({
                    error: "Product not found"
                });
            }

            db.run(
                `DELETE FROM transactions WHERE product_id = ?`,
                [req.params.id],
                (transactionErr) => {

                    if (transactionErr) {
                        return res.status(500).json({
                            error: "Failed to remove transactions"
                        });
                    }

                    db.run(
                        `DELETE FROM products WHERE id = ?`,
                        [req.params.id],
                        (deleteErr) => {

                            if (deleteErr) {
                                return res.status(500).json({
                                    error: "Failed to delete product"
                                });
                            }

                            res.json({
                                message: "Product deleted successfully"
                            });
                        }
                    );
                }
            );
        }
    );
});


// ======================================================
// STOCK TRANSACTIONS
// ======================================================

// STOCK IN / OUT
app.post("/api/transactions", (req, res) => {

    const {
        product_id,
        type,
        quantity,
        note
    } = req.body;

    const productId = Number(product_id);
    const qty = Number(quantity);

    if (
        !Number.isInteger(productId) ||
        !["IN", "OUT"].includes(type) ||
        !Number.isInteger(qty) ||
        qty <= 0
    ) {
        return res.status(400).json({
            error: "Invalid transaction data"
        });
    }

    db.get(
        `SELECT id FROM products WHERE id = ?`,
        [productId],
        (err, product) => {

            if (err) {
                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (!product) {
                return res.status(404).json({
                    error: "Product not found"
                });
            }

            calculateStock(
                productId,
                (stockErr, currentStock) => {

                    if (stockErr) {
                        return res.status(500).json({
                            error: "Could not calculate stock"
                        });
                    }

                    if (
                        type === "OUT" &&
                        qty > currentStock
                    ) {
                        return res.status(400).json({
                            error: `Insufficient stock. Available stock: ${currentStock}`
                        });
                    }

                    db.run(
                        `
                        INSERT INTO transactions
                        (product_id, type, quantity, note)
                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            productId,
                            type,
                            qty,
                            note || ""
                        ],
                        function (insertErr) {

                            if (insertErr) {
                                return res.status(500).json({
                                    error: "Failed to record transaction"
                                });
                            }

                            calculateStock(
                                productId,
                                (newStockErr, newStock) => {

                                    if (newStockErr) {
                                        return res.status(500).json({
                                            error: "Transaction saved but stock calculation failed"
                                        });
                                    }

                                    res.status(201).json({
                                        message: "Transaction recorded successfully",
                                        transactionId: this.lastID,
                                        stock: newStock
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});


// ======================================================
// TRANSACTION HISTORY
// ======================================================

app.get("/api/transactions", (req, res) => {

    const query = `
        SELECT
            t.id,
            t.product_id,
            p.name AS product_name,
            p.sku,
            t.type,
            t.quantity,
            t.note,
            t.created_at
        FROM transactions t
        JOIN products p
            ON p.id = t.product_id
        ORDER BY t.created_at DESC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: "Failed to fetch transaction history"
            });
        }

        res.json(rows);
    });
});


// ======================================================
// DASHBOARD SUMMARY
// ======================================================

app.get("/api/dashboard", (req, res) => {

    const query = `
        SELECT
            COUNT(*) AS total_products,
            COALESCE(SUM(stock), 0) AS total_stock,
            COALESCE(SUM(
                CASE
                    WHEN stock <= low_stock_threshold THEN 1
                    ELSE 0
                END
            ), 0) AS low_stock_products
        FROM (
            SELECT
                p.id,
                p.low_stock_threshold,
                COALESCE(
                    SUM(
                        CASE
                            WHEN t.type = 'IN' THEN t.quantity
                            WHEN t.type = 'OUT' THEN -t.quantity
                        END
                    ),
                    0
                ) AS stock
            FROM products p
            LEFT JOIN transactions t
                ON p.id = t.product_id
            GROUP BY p.id
        )
    `;

    db.get(query, [], (err, row) => {

        if (err) {
            return res.status(500).json({
                error: "Failed to load dashboard"
            });
        }

        res.json(row);
    });
});


// ======================================================
// SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Inventory Management System running on port ${PORT}`
    );

});