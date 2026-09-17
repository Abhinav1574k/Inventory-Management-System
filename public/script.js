const productTable =
    document.getElementById("productTable");

const transactionTable =
    document.getElementById("transactionTable");

const totalProducts =
    document.getElementById("totalProducts");

const totalStock =
    document.getElementById("totalStock");

const lowStock =
    document.getElementById("lowStock");

const alertBox =
    document.getElementById("alertBox");

const searchInput =
    document.getElementById("searchInput");


// ======================================================
// MODALS
// ======================================================

const productModal =
    document.getElementById("productModal");

const transactionModal =
    document.getElementById("transactionModal");


// ======================================================
// API HELPER
// ======================================================

async function api(url, options = {}) {

    const response =
        await fetch(url, {
            headers: {
                "Content-Type": "application/json"
            },
            ...options
        });

    const text =
        await response.text();

    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(
            "Server returned an invalid response."
        );
    }

    if (!response.ok) {
        throw new Error(
            data.error || "Something went wrong."
        );
    }

    return data;
}


// ======================================================
// LOAD EVERYTHING
// ======================================================

async function loadData() {

    try {

        await Promise.all([
            loadProducts(),
            loadTransactions(),
            loadDashboard()
        ]);

    } catch (error) {

        showAlert(error.message);
    }
}


// ======================================================
// PRODUCTS
// ======================================================

let products = [];

async function loadProducts() {

    products =
        await api("/api/products");

    renderProducts(products);
}


function renderProducts(list) {

    productTable.innerHTML = "";

    if (list.length === 0) {

        productTable.innerHTML = `
            <tr>
                <td colspan="7">
                    No products found.
                </td>
            </tr>
        `;

        return;
    }


    list.forEach(product => {

        const isLow =
            product.stock <=
            product.low_stock_threshold;


        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>
                <strong>${escapeHTML(product.name)}</strong>
            </td>

            <td>
                ${escapeHTML(product.sku)}
            </td>

            <td>
                ${escapeHTML(product.category)}
            </td>

            <td>
                ₹${Number(product.price).toFixed(2)}
            </td>

            <td>
                <strong>${product.stock}</strong>
            </td>

            <td>
                <span class="status ${isLow ? "low" : "ok"}">
                    ${isLow ? "Low Stock" : "In Stock"}
                </span>
            </td>

            <td>

                <button
                    class="action-btn stock-btn"
                    onclick="openTransactionModal(${product.id})"
                >
                    Stock
                </button>

                <button
                    class="action-btn edit-btn"
                    onclick="editProduct(${product.id})"
                >
                    Edit
                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="deleteProduct(${product.id})"
                >
                    Delete
                </button>

            </td>
        `;

        productTable.appendChild(row);
    });
}


// ======================================================
// SEARCH
// ======================================================

searchInput.addEventListener(
    "input",
    function () {

        const query =
            searchInput.value
                .toLowerCase()
                .trim();


        const filtered =
            products.filter(product =>

                product.name
                    .toLowerCase()
                    .includes(query)

                ||

                product.sku
                    .toLowerCase()
                    .includes(query)

                ||

                product.category
                    .toLowerCase()
                    .includes(query)
            );


        renderProducts(filtered);
    }
);


// ======================================================
// ADD PRODUCT
// ======================================================

document
    .getElementById("addProductBtn")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("productForm")
                .reset();

            document
                .getElementById("productId")
                .value = "";

            document
                .getElementById("productModalTitle")
                .textContent = "Add Product";

            productModal.classList.add("show");
        }
    );


// ======================================================
// EDIT PRODUCT
// ======================================================

async function editProduct(id) {

    try {

        const product =
            await api(`/api/products/${id}`);


        document
            .getElementById("productId")
            .value = product.id;

        document
            .getElementById("productName")
            .value = product.name;

        document
            .getElementById("productSku")
            .value = product.sku;

        document
            .getElementById("productCategory")
            .value = product.category;

        document
            .getElementById("productPrice")
            .value = product.price;

        document
            .getElementById("productThreshold")
            .value =
            product.low_stock_threshold;


        document
            .getElementById("productModalTitle")
            .textContent = "Edit Product";


        productModal.classList.add("show");

    } catch (error) {

        showAlert(error.message);
    }
}


// ======================================================
// SAVE PRODUCT
// ======================================================

document
    .getElementById("productForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const id =
                document
                    .getElementById("productId")
                    .value;


            const data = {

                name:
                    document
                        .getElementById("productName")
                        .value
                        .trim(),

                sku:
                    document
                        .getElementById("productSku")
                        .value
                        .trim(),

                category:
                    document
                        .getElementById("productCategory")
                        .value
                        .trim(),

                price:
                    Number(
                        document
                            .getElementById("productPrice")
                            .value
                    ),

                low_stock_threshold:
                    Number(
                        document
                            .getElementById("productThreshold")
                            .value
                    )
            };


            try {

                if (id) {

                    await api(
                        `/api/products/${id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(data)
                        }
                    );

                } else {

                    await api(
                        "/api/products",
                        {
                            method: "POST",
                            body: JSON.stringify(data)
                        }
                    );
                }


                closeProductModal();

                await loadData();

            } catch (error) {

                showAlert(error.message);
            }
        }
    );


// ======================================================
// DELETE PRODUCT
// ======================================================

async function deleteProduct(id) {

    const confirmed =
        confirm(
            "Delete this product and its transaction history?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/api/products/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadData();

    } catch (error) {

        showAlert(error.message);
    }
}


// ======================================================
// TRANSACTION MODAL
// ======================================================

function openTransactionModal(id) {

    const product =
        products.find(
            item => item.id === id
        );


    if (!product) {
        return;
    }


    document
        .getElementById("transactionProductId")
        .value = id;


    document
        .getElementById("transactionProductName")
        .textContent =
        `${product.name} — Current Stock: ${product.stock}`;


    document
        .getElementById("transactionForm")
        .reset();


    document
        .getElementById("transactionProductId")
        .value = id;


    transactionModal.classList.add("show");
}


// ======================================================
// TRANSACTION SUBMIT
// ======================================================

document
    .getElementById("transactionForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const data = {

                product_id:
                    Number(
                        document
                            .getElementById(
                                "transactionProductId"
                            )
                            .value
                    ),

                type:
                    document
                        .getElementById(
                            "transactionType"
                        )
                        .value,

                quantity:
                    Number(
                        document
                            .getElementById(
                                "transactionQuantity"
                            )
                            .value
                    ),

                note:
                    document
                        .getElementById(
                            "transactionNote"
                        )
                        .value
                        .trim()
            };


            try {

                await api(
                    "/api/transactions",
                    {
                        method: "POST",
                        body: JSON.stringify(data)
                    }
                );


                closeTransactionModal();

                await loadData();

            } catch (error) {

                showAlert(error.message);
            }
        }
    );


// ======================================================
// TRANSACTION HISTORY
// ======================================================

async function loadTransactions() {

    const transactions =
        await api("/api/transactions");


    transactionTable.innerHTML = "";


    if (transactions.length === 0) {

        transactionTable.innerHTML = `
            <tr>
                <td colspan="5">
                    No transactions recorded yet.
                </td>
            </tr>
        `;

        return;
    }


    transactions.forEach(transaction => {

        const row =
            document.createElement("tr");


        const date =
            new Date(
                transaction.created_at
            ).toLocaleString();


        row.innerHTML = `

            <td>
                ${escapeHTML(date)}
            </td>

            <td>
                <strong>
                    ${escapeHTML(
                        transaction.product_name
                    )}
                </strong>
                <br>
                <small>
                    ${escapeHTML(transaction.sku)}
                </small>
            </td>

            <td>

                <span class="status ${
                    transaction.type === "IN"
                        ? "ok"
                        : "low"
                }">

                    ${transaction.type === "IN"
                        ? "Stock In"
                        : "Stock Out"}

                </span>

            </td>

            <td>
                ${transaction.quantity}
            </td>

            <td>
                ${escapeHTML(
                    transaction.note || "-"
                )}
            </td>
        `;


        transactionTable.appendChild(row);
    });
}


// ======================================================
// DASHBOARD
// ======================================================

async function loadDashboard() {

    const data =
        await api("/api/dashboard");


    totalProducts.textContent =
        data.total_products;


    totalStock.textContent =
        data.total_stock;


    lowStock.textContent =
        data.low_stock_products;


    if (data.low_stock_products > 0) {

        alertBox.innerHTML = `
            <div class="alert">
                ⚠️ ${data.low_stock_products}
                product(s) are currently below
                their low-stock threshold.
            </div>
        `;

    } else {

        alertBox.innerHTML = "";
    }
}


// ======================================================
// CLOSE MODALS
// ======================================================

document
    .getElementById("closeProductModal")
    .addEventListener(
        "click",
        closeProductModal
    );


document
    .getElementById("closeTransactionModal")
    .addEventListener(
        "click",
        closeTransactionModal
    );


function closeProductModal() {

    productModal.classList.remove("show");
}


function closeTransactionModal() {

    transactionModal.classList.remove("show");
}


// Close if clicking outside

window.addEventListener(
    "click",
    function (event) {

        if (event.target === productModal) {
            closeProductModal();
        }

        if (event.target === transactionModal) {
            closeTransactionModal();
        }
    }
);


// ======================================================
// ALERT
// ======================================================

function showAlert(message) {

    alertBox.innerHTML = `
        <div class="alert">
            ⚠️ ${escapeHTML(message)}
        </div>
    `;


    setTimeout(() => {

        alertBox.innerHTML = "";

    }, 4000);
}


// ======================================================
// SECURITY HELPER
// ======================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ======================================================
// START APPLICATION
// ======================================================

loadData();