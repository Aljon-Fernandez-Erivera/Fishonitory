import { useEffect, useState } from "react";
import { useAuth } from "../shared/useAuth.js";
import Sales from "../shared/Sales.jsx";
import SalesSummary from "../shared/SalesSummary.jsx";
import { formatPeso, getDefaultSalesRange } from "../shared/salesUtils.js";
import { API_URL } from "../../config.js";
import "../../css/owner-dashboard-layout.css";


// Choices para sa mga fish tank statuses na pwedeng i-update ng staff sa dashboard.
const tankStatuses = [
  "Needs Cleaning",
  "Clean",
  "For Replacement",
  "Damaged",
  "Under Maintenance",
  "Available",
];

// Function to make API requests with authentication headers
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  // Handle API response and throw error if not ok
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  // Return the data if the request is successful
  return data;
}

// Staffdashboard things
function StaffDashboard() {
  const { user, authReady, logout } = useAuth();

  const [activePage, setActivePage] = useState("overview");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [fish, setFish] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [sales, setSales] = useState([]);
  const [salesRange, setSalesRange] = useState({
    startDate: "",
    endDate: "",
  });

  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fishInventory = fish.filter(
    (item) => (item.category || "Fish") !== "Fish Food",
  );
  const food = fish.filter((item) => item.category === "Fish Food");
  const inventory = [...fishInventory, ...food];
  const fishTypesCount = new Set(
    fishInventory.map((item) => item.species || item.name),
  ).size;

  // Load data from the server for fish, tanks, notes, and sales
  const loadData = async () => {
    try {
      const [fishData, tankData, noteData, salesData] = await Promise.all([
        apiRequest("/fish"),
        apiRequest("/store/tanks"),
        apiRequest("/notes"),
        apiRequest("/sales"),
      ]);

      setFish(fishData.fish);
      setTanks(tankData.tanks);
      setNotes(noteData.notes);
      setSales(salesData.sales);
      setSalesRange((currentRange) => {
        if (currentRange.startDate && currentRange.endDate) {
          return currentRange;
        }

        return getDefaultSalesRange(salesData.sales);
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  // Use effect to check user role and load data on component mount
  useEffect(() => {
    if (!authReady) return undefined;
    if (user?.role !== "masterStaff") {
      window.location.replace("/login");
      return;
    }

    const loadTimer = setTimeout(loadData, 0);
    return () => clearTimeout(loadTimer);
  }, [authReady, user]);

  const addToCart = (item) => {
    setCart((previous) => {
      const existing = previous.find((cartItem) => cartItem._id === item._id);

      if (existing) {
        return previous.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }

      return [...previous, { ...item, quantity: 1 }];
    });
  };

  // Adjust the quantity of an item in the cart by a specified amount, removing it if the quantity goes to zero or below
  const adjustQuantity = (item, amount) => {
    setCart((previous) => {
      const existing = previous.find((cartItem) => cartItem._id === item._id);

      if (!existing && amount > 0) {
        return [...previous, { ...item, quantity: 1 }];
      }

      return previous.flatMap((cartItem) => {
        if (cartItem._id !== item._id) {
          return [cartItem];
        }

        const nextQuantity = cartItem.quantity + amount;

        return nextQuantity > 0
          ? [{ ...cartItem, quantity: nextQuantity }]
          : [];
      });
    });
  };

  // Calculate subtotal, discount amount, and total for the cart
  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const discountAmount = Math.min(subtotal, Math.max(0, Number(discount) || 0));

  const total = subtotal - discountAmount;

  const addNote = async (event) => {
    event.preventDefault();

    try {
      await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify({ text: note }),
      });

      setNote("");
      setMessage("Your note has been successfully added.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateTank = async (id, status) => {
    try {
      await apiRequest(`/store/tanks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setMessage("Tank status updated.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const checkout = async () => {
    if (!cart.length) {
      return;
    }

    try {
      const data = await apiRequest("/sales", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((item) => ({
            itemId: item._id,
            name: item.name,
            quantity: item.quantity,
          })),
          discount,
        }),
      });

      setReceipt(data.sale);
      setCheckoutOpen(false);
      setCart([]);
      setDiscount(0);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const printReceipt = () => {
    const printWindow = window.open("", "_blank", "width=480,height=700");

    if (!printWindow || !receipt) {
      return;
    }

    const receiptItems = receipt.items
      .map(
        (item) => `
                    <tr>
                        <td>${item.name} x${item.quantity}</td>
                        <td>${formatPeso(item.total)}</td>
                    </tr>
                `,
      )
      .join("");

    // Writing receipt content para sa printing.
    printWindow.document.write(`
            <html>
                <head>
                    <title>Fishonitory Receipt</title>
                    <style>
                        body { font-family: Arial; padding: 24px; }
                        h1 { text-align: center; }
                        table { width: 100%; border-collapse: collapse; }
                        td { padding: 6px 0; border-bottom: 1px solid #ddd; }
                        .total { font-size: 18px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Fishonitory Receipt</h1>
                    <p>
                        Cashier: ${user?.role || "Staff"}<br />
                        Date: ${new Date(receipt.createdAt).toLocaleString()}
                    </p>
                    <table>${receiptItems}</table>
                    <p>
                        Subtotal: ${formatPeso(receipt.subtotal)}<br />
                        Discount: ${formatPeso(receipt.discount)}<br />
                        <span class="total">
                            TOTAL: ${formatPeso(receipt.total)}
                        </span>
                    </p>
                </body>
            </html>
        `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (user?.role !== "masterStaff") {
    return null;
  }

  const dashboardPages = [
    "overview",
    "inventory",
    "tanks",
    "calculator",
    "sales",
    "leave-note",
    "announcements",
  ];

  // Render the staff dashboard with navigation, content sections, and modals for inventory and checkout
  return (
    <main className="owner-dashboard">
      <aside className="owner-sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">F</span>
          <div>
            <strong>Fishonitory</strong>
            <small>Staff workspace</small>
          </div>
        </div>

        {/*Side navigation bar*/}
        <nav className="sidebar-nav" aria-label="Staff dashboard navigation">
          {dashboardPages.map((page) => (
            <button
              key={page}
              className={
                activePage === page ? "nav-button active" : "nav-button"
              }
              type="button"
              onClick={() => setActivePage(page)}
            >
              {page === "leave-note"
                ? "Leave Note"
                : page.charAt(0).toUpperCase() + page.slice(1)}
            </button>
          ))}
        </nav>

        <button
          className="nav-button logout-button"
          type="button"
          onClick={async () => {
            await logout();
            window.location.replace("/login");
          }}
        >
          Logout
        </button>
      </aside>

      <div className="owner-content">
        <header className="content-header">
          <div>
            <p className="eyebrow">STAFF WORKSPACE</p>
          </div>
          <span className="status-dot">System online</span>
        </header>
        {/**/}
        {message && (
          <p className="feedback success" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="feedback error" role="alert">
            {error}
          </p>
        )}

        <section className="dashboard-page">
          {activePage === "overview" && (
            <div className="stats-grid">
              <article className="stat-card">
                <span>Fish Species</span>
                <strong>{fishTypesCount}</strong>
                <small>Unique fish listed</small>
              </article>

              <article className="stat-card">
                <span>Total Fish Stock</span>
                <strong>
                  {fishInventory.reduce((sum, item) => sum + item.quantity, 0)}
                </strong>
                <small>Available live units</small>
              </article>

              <article className="stat-card">
                <span>Food Supplies</span>
                <strong>
                  {food.reduce((sum, item) => sum + item.quantity, 0)}
                </strong>
                <small>Feed inventory units</small>
              </article>

              <article className="stat-card">
                <span>Total Tanks</span>
                <strong>{tanks.length}</strong>
                <small>Active store tanks</small>
              </article>

              <article className="stat-card">
                <span>Cart Total</span>
                <strong>{formatPeso(total)}</strong>
                <small>Current transaction total</small>
              </article>
            </div>
          )}

          {activePage === "inventory" && (
            <div className="report-card">
              <h2>Fish Inventory</h2>
              <ul>
                {fishInventory.map((item) => (
                  <li key={item._id}>
                    {item.name} ({item.category || "Fish"}) - {item.quantity}{" "}
                    available - {formatPeso(item.price)}{" "}
                    <button type="button" onClick={() => addToCart(item)}>
                      Add to Cart
                    </button>
                  </li>
                ))}
              </ul>
              <h2>Food Inventory</h2>
              <ul>
                {food.map((item) => (
                  <li key={item._id}>
                    {item.name} - {item.quantity} available -{" "}
                    {formatPeso(item.price)}{" "}
                    <button type="button" onClick={() => addToCart(item)}>
                      Add to Cart
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activePage === "tanks" && (
            <div className="report-card">
              <h2>Tank Updates</h2>
              <ul>
                {tanks.map((tank) => (
                  <li key={tank._id}>
                    <strong>{tank.name}</strong>{" "}
                    <select
                      value={tank.status}
                      onChange={(event) =>
                        updateTank(tank._id, event.target.value)
                      }
                    >
                      {tankStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    {tank.nextMaintenance && (
                      <small>
                        {" "}
                        Maintenance:{" "}
                        {new Date(tank.nextMaintenance).toLocaleDateString()}
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activePage === "calculator" && (
            <div className="report-card">
              <h2>Cart</h2>

              <button type="button" onClick={() => setInventoryOpen(true)}>
                Open Inventory
              </button>

              <dialog
                open={inventoryOpen}
                aria-labelledby="cart-inventory-title"
              >
                <h3 id="cart-inventory-title">Select Inventory</h3>

                <ul>
                  {inventory.map((item) => (
                    <li key={item._id}>
                      {item.name} ({item.category || "Fish"}) -{" "}
                      {formatPeso(item.price)}{" "}
                      <button
                        type="button"
                        onClick={() => adjustQuantity(item, -1)}
                      >
                        -
                      </button>{" "}
                      <strong>
                        {cart.find((cartItem) => cartItem._id === item._id)
                          ?.quantity || 0}
                      </strong>{" "}
                      <button
                        type="button"
                        onClick={() => adjustQuantity(item, 1)}
                      >
                        +
                      </button>
                    </li>
                  ))}
                </ul>

                <button type="button" onClick={() => setInventoryOpen(false)}>
                  Done
                </button>
              </dialog>

              <h3>Items in Cart</h3>
              <ul>
                {cart.map((item) => (
                  <li key={item._id}>
                    {item.name}{" "}
                    <button
                      type="button"
                      onClick={() => adjustQuantity(item, -1)}
                    >
                      -
                    </button>{" "}
                    <strong>{item.quantity}</strong>{" "}
                    <button
                      type="button"
                      onClick={() => adjustQuantity(item, 1)}
                    >
                      +
                    </button>{" "}
                    x {formatPeso(item.price)} ={" "}
                    {formatPeso(item.price * item.quantity)}
                  </li>
                ))}
              </ul>

              <p>Subtotal: {formatPeso(subtotal)}</p>

              <label>
                Discount
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </label>

              <h3>Total: {formatPeso(total)}</h3>

              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                disabled={!cart.length}
              >
                Confirm Checkout
              </button>

              <dialog open={checkoutOpen} aria-labelledby="checkout-title">
                <h3 id="checkout-title">Confirm Checkout</h3>
                <p>Confirm this sale for {formatPeso(total)}?</p>
                <button type="button" onClick={checkout}>
                  Confirm and Show Receipt
                </button>
                <button type="button" onClick={() => setCheckoutOpen(false)}>
                  Cancel
                </button>
              </dialog>

              {receipt && (
                <dialog
                  open={Boolean(receipt) && !checkoutOpen}
                  aria-labelledby="receipt-title"
                >
                  <h3 id="receipt-title">Fishonitory Receipt</h3>
                  <p>
                    Cashier:{" "}
                    {receipt.soldBy?.staffName || user?.role || "Staff"}
                    <br />
                    {new Date(receipt.createdAt).toLocaleString()}
                  </p>

                  <ul>
                    {receipt.items.map((item) => (
                      <li key={item.itemId}>
                        {item.name} x{item.quantity} - {formatPeso(item.total)}
                      </li>
                    ))}
                  </ul>

                  <p>
                    Subtotal: {formatPeso(receipt.subtotal)}
                    <br />
                    Discount: {formatPeso(receipt.discount)}
                    <br />
                    <strong>Total: {formatPeso(receipt.total)}</strong>
                  </p>

                  <button type="button" onClick={printReceipt}>
                    Print Receipt
                  </button>
                  <button type="button" onClick={() => setReceipt(null)}>
                    Close
                  </button>
                </dialog>
              )}
            </div>
          )}

          {activePage === "overview" && (
            <SalesSummary
              sales={sales}
              startDate={salesRange.startDate}
              endDate={salesRange.endDate}
              onDateChange={(field, value) =>
                setSalesRange((previous) => ({
                  ...previous,
                  [field]: value,
                }))
              }
            />
          )}

          {activePage === "sales" && (
            <Sales
              sales={sales}
              startDate={salesRange.startDate}
              endDate={salesRange.endDate}
              onDateChange={(field, value) =>
                setSalesRange((previous) => ({
                  ...previous,
                  [field]: value,
                }))
              }
            />
          )}

          {activePage === "leave-note" && (
            <div className="report-card">
              <h2>Leave Note for Next Shift</h2>

              <form className="dashboard-form" onSubmit={addNote}>
                <label>
                  Note
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    required
                  />
                </label>
                <button type="submit">Add Note</button>
              </form>

              <ul>
                {notes.map((item) => (
                  <li key={item._id}>{item.text}</li>
                ))}
              </ul>
            </div>
          )}

          {activePage === "announcements" && (
            <div className="report-card">
              <h2>Announcements</h2>
              <p>Owner notes and tank maintenance announcements appear here.</p>

              <ul>
                {notes.map((item) => (
                  <li key={item._id}>{item.text}</li>
                ))}

                {tanks
                  .filter((tank) => tank.nextMaintenance)
                  .map((tank) => (
                    <li key={`maintenance-${tank._id}`}>
                      {tank.name} maintenance scheduled for{" "}
                      {new Date(tank.nextMaintenance).toLocaleDateString()}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default StaffDashboard;
