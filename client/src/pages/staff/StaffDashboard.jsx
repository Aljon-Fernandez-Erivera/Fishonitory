import { useEffect, useState } from "react";
import { useAuth } from "../shared/useAuth.js";
import Sales from "../shared/Sales.jsx";
import SalesSummary from "../shared/SalesSummary.jsx";
import { formatPeso, getDefaultSalesRange } from "../shared/salesUtils.js";
import { API_URL } from "../../config.js";
import "../../css/owner-dashboard-layout.css";
import Swal from "sweetalert2";
import NotificationBell from "../shared/NotificationBell.jsx";
import { showOceanicLogoutConfirm } from "../../utils/oceanicSwal.js";

// Choices para sa mga fish tank statuses na pwedeng i-update ng staff sa dashboard.
const tankStatuses = [
  "Under Maintenance",
  "Available",
];

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Function to make API requests with authentication headers
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Session-Role": "masterStaff",
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

// Staff dashboard component
function StaffDashboard() {
  const { user, authReady, logout } = useAuth();

  const [activePage, setActivePage] = useState("overview");
  const [settingsTab, setSettingsTab] = useState("profile");
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
  const [timeClock, setTimeClock] = useState({ email: "", password: "" });
  const [timeClockBusy, setTimeClockBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: message,
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
    });
    const timer = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) return undefined;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "error",
      title: error,
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
    });
    const timer = window.setTimeout(() => setError(""), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);

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

  const submitTimeClock = async (action) => {
    if (!timeClock.email || !timeClock.password)
      return setError(
        "Enter the staff email and password to record attendance.",
      );
    setTimeClockBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/attendance/staff-time-clock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...timeClock, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message || "Could not record attendance.");
      setMessage(data.message);
      setTimeClock({ email: "", password: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setTimeClockBusy(false);
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

  useEffect(() => {
    if (!authReady || user?.role !== "masterStaff") return undefined;
    const timer = window.setInterval(loadData, 10000);
    return () => window.clearInterval(timer);
  }, [authReady, user?.role]);

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
    (totalValue, item) => totalValue + item.price * item.quantity,
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
      setMessage("Your announcement has been posted.");
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
            <td>${escapeHtml(item.name)} x${escapeHtml(item.quantity)}</td>
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
            body { font-family: Arial; padding: 24px; color: #111; }
            h1 { text-align: center; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            td { padding: 8px 0; border-bottom: 1px solid #ddd; }
            .total { font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Fishonitory Receipt</h1>
          <p>
            Cashier: ${escapeHtml(user?.staffName || user?.role || "Staff")}<br />
            Date: ${new Date(receipt.createdAt).toLocaleString()}
          </p>
          <table>${receiptItems}</table>
          <p style="margin-top: 16px;">
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

  const navButtonClass = (page) =>
    `shrink-0 rounded-md border-0 bg-clip-padding px-3 py-2 text-left font-['Poppins'] text-[0.78rem] leading-tight outline-none transition [-webkit-appearance:none] [appearance:none] [box-shadow:none] focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer ${
      activePage === page
        ? "bg-[#65c9c9] font-medium text-[#073047] hover:bg-[#75cccc]"
        : "bg-transparent text-[#8fb7be] hover:text-[#d9ecef]"
    }`;

  const settingsTabClass = (tab) =>
    `rounded-xl px-4 py-2 font-['Poppins'] text-xs sm:text-sm font-medium transition cursor-pointer ${
      settingsTab === tab
        ? "bg-[#65c9c9] text-[#073047] shadow-sm"
        : "bg-white/[.04] text-[#8fb7be] hover:bg-white/[.08] hover:text-[#d9ecef]"
    }`;

  return (
    <main className="owner-dashboard-main box-border flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] text-[#c9e1e5] md:flex-row">
      <button
        type="button"
        aria-label={sidebarOpen ? "Close dashboard menu" : "Open dashboard menu"}
        aria-expanded={sidebarOpen}
        className={`owner-mobile-menu-toggle ${sidebarOpen ? "is-open" : ""}`}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`owner-mobile-backdrop ${sidebarOpen ? "is-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* SIDEBAR */}
      <aside className={`owner-sidebar box-border flex w-full shrink-0 flex-col overflow-hidden border-b border-cyan-100/[.08] bg-[#062f43] px-4 py-3 md:h-full md:w-56 md:border-b-0 md:border-r md:px-3 md:pt-4 md:pb-4 ${sidebarOpen ? "is-open" : ""}`}>
        {/* Brand */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          aria-label="Refresh Fishonitory workspace"
          title="Refresh dashboard"
          className="flex shrink-0 items-center gap-2.5 rounded-lg border-0 bg-transparent px-1 py-1 text-left transition hover:bg-white/[.04] focus:outline-none focus:ring-2 focus:ring-[#73c4ca] cursor-pointer"
        >
          <img
            src="/LOGO.svg"
            alt="Fishonitory"
            className="h-10 w-10 object-contain"
          />
          <div>
            <strong className="block font-['Poppins'] text-[0.9rem] font-medium text-[#cde4e6]">
              Fishonitory
            </strong>
            <small className="block font-['Poppins'] text-[0.58rem] text-[#7fa7ae]">
              Staff workspace
            </small>
          </div>
        </button>

        {/* Navigation list with independent scroll */}
        <nav
          className="mt-4 flex min-w-0 gap-0.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-6 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pr-1 [scrollbar-width:thin]"
          aria-label="Staff dashboard navigation"
        >
          <button
            className={navButtonClass("overview")}
            type="button"
            onClick={() => {
              setActivePage("overview");
              setSidebarOpen(false);
            }}
          >
            Overview
          </button>
          <button
            className={navButtonClass("time-clock")}
            type="button"
            onClick={() => {
              setActivePage("time-clock");
              setSidebarOpen(false);
            }}
          >
            Staff Time Clock
          </button>
          <button
            className={navButtonClass("inventory")}
            type="button"
            onClick={() => {
              setActivePage("inventory");
              setSidebarOpen(false);
            }}
          >
            Fish & Feed Inventory
          </button>
          <button
            className={navButtonClass("tanks")}
            type="button"
            onClick={() => {
              setActivePage("tanks");
              setSidebarOpen(false);
            }}
          >
            Tank Updates
          </button>
          <button
            className={navButtonClass("calculator")}
            type="button"
            onClick={() => {
              setActivePage("calculator");
              setSidebarOpen(false);
            }}
          >
            Point of Sale (POS)
          </button>
          <button
            className={navButtonClass("sales")}
            type="button"
            onClick={() => {
              setActivePage("sales");
              setSidebarOpen(false);
            }}
          >
            Sales
          </button>
          <button
            className={navButtonClass("leave-note")}
            type="button"
            onClick={() => {
              setActivePage("leave-note");
              setSidebarOpen(false);
            }}
          >
            Post to Board
          </button>
          <button
            className={navButtonClass("announcements")}
            type="button"
            onClick={() => {
              setActivePage("announcements");
              setSidebarOpen(false);
            }}
          >
            Announcements
          </button>
          <button
            className={navButtonClass("settings")}
            type="button"
            onClick={() => {
              setActivePage("settings");
              setSidebarOpen(false);
            }}
          >
            Settings
          </button>
        </nav>

        {/* Pinned Bottom Footer */}
        <div className="mt-auto shrink-0 border-t border-cyan-100/[.08] pt-2.5 pb-0.5 md:pt-3 md:pb-1">
          <div
            className="flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 transition hover:bg-white/[.04]"
            onClick={() => {
              setActivePage("settings");
              setSidebarOpen(false);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                setActivePage("settings");
                setSidebarOpen(false);
              }
            }}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#75bec4]/20 font-['Poppins'] text-sm font-semibold text-[#bce9e9]">
              {(user?.staffName || user?.email || "S")
                .trim()
                .charAt(0)
                .toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-['Poppins'] text-[0.78rem] font-medium text-[#cde4e6]">
                {user?.staffName || user?.email || "Master Staff"}
              </p>
              <p className="truncate font-['Poppins'] text-[0.62rem] text-[#6f9ca5]">
                {user?.staffPosition || "Operations Staff"}
              </p>
            </div>
          </div>
          <button
            className="mt-2.5 w-full rounded-lg border border-cyan-100/10 bg-white/[.05] px-3 py-2 text-center font-['Poppins'] text-[0.75rem] font-medium text-[#b8d8dd] outline-none transition hover:border-red-200/25 hover:bg-red-200/10 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-[#73c4ca]/50 cursor-pointer"
            type="button"
            onClick={async () => {
              const result = await showOceanicLogoutConfirm(async () => {
                await logout();
                window.location.replace("/login");
              });
              if (result.isConfirmed) {
                await logout();
                window.location.replace("/login");
              }
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE AREA */}
      <div className="owner-workspace min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5 lg:px-5 lg:py-8">
        {/* Header bar */}
        <header className="mb-7 flex w-full max-w-7xl items-start justify-between gap-4 border-b border-sky-100/10 pb-5">
          <div>
            <p className="font-['Poppins'] text-[0.65rem] font-medium tracking-[0.16em] text-[#73c4ca]">
              OPERATIONS CONTROL CENTER
            </p>
            <p className="mt-1 font-['Poppins'] text-xs text-[#759faa]">
              {currentTime.toLocaleDateString("en-PH", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100/10 bg-white/[.04] px-3 py-1.5 font-['Poppins'] text-xs text-[#a8c9d0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#73c4ca] shadow-[0_0_10px_#73c4ca]" />
              System online ·{" "}
              {currentTime.toLocaleTimeString("en-PH", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <NotificationBell
              notes={notes}
              fish={fish}
              tanks={tanks}
              onNavigate={setActivePage}
              announcementPage="announcements"
              viewerRole="masterStaff"
              viewerId={user?.id}
            />
          </div>
        </header>

        {/* DASHBOARD PAGE CONTENT */}
        <section className="mx-auto grid w-full max-w-7xl gap-6">
          {/* 1. OVERVIEW */}
          {activePage === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
                    Fish Species
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#d9ecef]">
                    {fishTypesCount}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#6f9ca5]">
                    Unique fish listed
                  </small>
                </article>

                <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
                    Total Fish Stock
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#d9ecef]">
                    {fishInventory.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    )}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#6f9ca5]">
                    Available live units
                  </small>
                </article>

                <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
                    Food Supplies
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#d9ecef]">
                    {food.reduce((sum, item) => sum + item.quantity, 0)}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#6f9ca5]">
                    Feed inventory units
                  </small>
                </article>

                <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#91b5bf]">
                    Total Tanks
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#d9ecef]">
                    {tanks.length}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#6f9ca5]">
                    Active store tanks
                  </small>
                </article>

                <article className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-5 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs text-[#89afb9]">
                    Cart Total
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#73c4ca]">
                    {formatPeso(total)}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#6f9ca5]">
                    Current transaction total
                  </small>
                </article>
              </div>

              <div>
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
              </div>
            </div>
          )}

          {/* 2. INVENTORY */}
          {activePage === "inventory" && (
            <div className="space-y-6">
              {/* Fish Livestock */}
              <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100/10 pb-4">
                  <div>
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      Fish Livestock
                    </h3>
                    <p className="mt-0.5 font-['Poppins'] text-xs text-[#9bbec7]">
                      Live ornamental fish currently listed in store stock.
                    </p>
                  </div>
                  <span className="rounded-full border border-sky-100/15 bg-white/[.04] px-3 py-1 font-['Poppins'] text-xs text-[#73c4ca]">
                    {fishInventory.length} Species
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {fishInventory.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-col justify-between rounded-xl border border-sky-100/[.08] bg-white/[.03] p-4 transition hover:border-sky-100/20"
                    >
                      <div className="flex gap-3">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#0a4261] text-xl">
                            🐟
                          </div>
                        )}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <strong className="font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                              {item.name}
                            </strong>
                            <span className="rounded-md bg-[#75bec4]/15 px-2 py-0.5 font-['Poppins'] text-[10px] font-medium text-[#bce9e9]">
                              {item.category || "Fish"}
                            </span>
                          </div>
                          <p className="mt-1 font-['Poppins'] text-xs text-[#89afb9]">
                            Available:{" "}
                            <span className="font-semibold text-[#d9ecef]">
                              {item.quantity}
                            </span>{" "}
                            units
                          </p>
                          <p className="mt-1 font-['Fraunces'] text-base font-bold text-[#73c4ca]">
                            {formatPeso(item.price)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="mt-3 w-full rounded-lg bg-[#75bec4] py-2 text-center font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#86d0d6] cursor-pointer"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Food Supplies */}
              <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100/10 pb-4">
                  <div>
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      Food Supplies
                    </h3>
                    <p className="mt-0.5 font-['Poppins'] text-xs text-[#9bbec7]">
                      Fish food pellets, supplements, and aquatic supplies.
                    </p>
                  </div>
                  <span className="rounded-full border border-sky-100/15 bg-white/[.04] px-3 py-1 font-['Poppins'] text-xs text-[#73c4ca]">
                    {food.length} Products
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {food.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-col justify-between rounded-xl border border-sky-100/[.08] bg-white/[.03] p-4 transition hover:border-sky-100/20"
                    >
                      <div className="flex gap-3">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#0a4261] text-xl">
                            🐟
                          </div>
                        )}
                        <div>
                          <strong className="font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                            {item.name}
                          </strong>
                          <p className="mt-1 font-['Poppins'] text-xs text-[#89afb9]">
                            Available:{" "}
                            <span className="font-semibold text-[#d9ecef]">
                              {item.quantity}
                            </span>{" "}
                            units
                          </p>
                          <p className="mt-1 font-['Fraunces'] text-base font-bold text-[#73c4ca]">
                            {formatPeso(item.price)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="mt-3 w-full rounded-lg bg-[#75bec4] py-2 text-center font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#86d0d6] cursor-pointer"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. TANKS */}
          {activePage === "tanks" && (
            <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
              <div className="border-b border-sky-100/10 pb-4">
                <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                  Tank Updates
                </h3>
                <p className="mt-0.5 font-['Poppins'] text-xs text-[#9bbec7]">
                  Monitor and update sanitation and equipment condition for
                  active tanks.
                </p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tanks.map((tank) => (
                  <div
                    key={tank._id}
                    className="rounded-xl border border-sky-100/[.08] bg-white/[.03] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="font-['Poppins'] text-base font-medium text-[#d9ecef]">
                        {tank.name}
                      </strong>
                      <span className="rounded-md bg-white/[.06] px-2 py-0.5 font-['Poppins'] text-[10px] text-[#73c4ca]">
                        Tank #{tank._id.slice(-4)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <label className="block font-['Poppins'] text-[10px] font-semibold uppercase tracking-wider text-[#89afb9]">
                        Condition Status
                      </label>
                      <select
                        value={tank.status}
                        onChange={(event) =>
                          updateTank(tank._id, event.target.value)
                        }
                        className="mt-1 w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3 py-2 font-['Poppins'] text-xs text-[#d9ecef] outline-none transition focus:border-[#73c4ca] cursor-pointer"
                      >
                        {tankStatuses.map((status) => (
                          <option
                            key={status}
                            value={status}
                            className="bg-[#062d48] text-[#d9ecef]"
                          >
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    {tank.nextMaintenance && (
                      <p className="mt-3 font-['Poppins'] text-[11px] text-[#7fa7ae]">
                        Next maintenance:{" "}
                        <span className="font-medium text-[#bce9e9]">
                          {new Date(tank.nextMaintenance).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. CALCULATOR / POS */}
          {activePage === "calculator" && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Items in Cart */}
              <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100/10 pb-4">
                  <div>
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      Active Sale Cart
                    </h3>
                    <p className="mt-0.5 font-['Poppins'] text-xs text-[#9bbec7]">
                      Add products and adjust quantities for retail purchase.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInventoryOpen(true)}
                    className="rounded-full bg-[#75bec4] px-4 py-2 font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#86d0d6] cursor-pointer"
                  >
                    + Open Inventory Selector
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="font-['Poppins'] text-sm text-[#7fa7ae]">
                      The cart is currently empty.
                    </p>
                    <button
                      type="button"
                      onClick={() => setInventoryOpen(true)}
                      className="mt-3 rounded-full border border-sky-100/20 bg-white/[.04] px-4 py-2 font-['Poppins'] text-xs text-[#73c4ca] hover:bg-white/[.08] cursor-pointer"
                    >
                      Browse Available Products
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item._id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100/[.07] bg-white/[.03] p-3.5"
                      >
                        <div>
                          <strong className="block font-['Poppins'] text-sm text-[#d9ecef]">
                            {item.name}
                          </strong>
                          <span className="font-['Poppins'] text-xs text-[#7fa7ae]">
                            {formatPeso(item.price)} each
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center rounded-lg border border-sky-100/15 bg-white/[.05]">
                            <button
                              type="button"
                              onClick={() => adjustQuantity(item, -1)}
                              className="px-2.5 py-1 text-sm font-bold text-[#bce9e9] hover:bg-white/[.08] cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-3 font-['Poppins'] text-xs font-semibold text-[#d9ecef]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustQuantity(item, 1)}
                              className="px-2.5 py-1 text-sm font-bold text-[#bce9e9] hover:bg-white/[.08] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <span className="w-24 text-right font-['Fraunces'] text-sm font-bold text-[#73c4ca]">
                            {formatPeso(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary & Checkout Card */}
              <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-1">
                <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                  Order Total
                </h3>

                <div className="mt-5 space-y-3 font-['Poppins'] text-xs text-[#9bbec7]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#d9ecef]">
                      {formatPeso(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[#89afb9]">Discount (₱)</label>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(event) => setDiscount(event.target.value)}
                      className="w-24 rounded-lg border border-sky-100/15 bg-white/[.07] px-2.5 py-1 text-right font-['Poppins'] text-xs text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                    />
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Discount Applied</span>
                      <span>-{formatPeso(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-sky-100/10 pt-3 text-sm font-semibold">
                    <span className="text-[#d9ecef]">Total Due</span>
                    <span className="font-['Fraunces'] text-xl font-bold text-[#73c4ca]">
                      {formatPeso(total)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!cart.length}
                  onClick={() => setCheckoutOpen(true)}
                  className="mt-6 w-full rounded-xl bg-[#75bec4] py-3 text-center font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#86d0d6] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Confirm Checkout
                </button>
              </div>

              {/* MODAL 1: Select from Inventory */}
              {inventoryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                  <div className="box-border flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-sky-100/10 pb-4">
                      <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                        Select Inventory Items
                      </h3>
                      <button
                        type="button"
                        onClick={() => setInventoryOpen(false)}
                        className="cursor-pointer bg-transparent border-0 text-lg text-[#89afb9] hover:text-[#d9ecef]"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
                      {inventory.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between rounded-xl border border-sky-100/[.08] bg-white/[.03] p-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt=""
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a4261]">
                                🐟
                              </div>
                            )}
                            <div>
                              <strong className="block font-['Poppins'] text-sm text-[#d9ecef]">
                                {item.name}
                              </strong>
                              <span className="font-['Poppins'] text-[11px] text-[#7fa7ae]">
                                {formatPeso(item.price)} (
                                {item.category || "Fish"})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center rounded-lg border border-sky-100/15 bg-white/[.05]">
                            <button
                              type="button"
                              onClick={() => adjustQuantity(item, -1)}
                              className="px-2.5 py-1 text-sm font-bold text-[#bce9e9] hover:bg-white/[.08] cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-3 font-['Poppins'] text-xs font-semibold text-[#d9ecef]">
                              {cart.find(
                                (cartItem) => cartItem._id === item._id,
                              )?.quantity || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustQuantity(item, 1)}
                              className="px-2.5 py-1 text-sm font-bold text-[#bce9e9] hover:bg-white/[.08] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 border-t border-sky-100/10 pt-4 text-right">
                      <button
                        type="button"
                        onClick={() => setInventoryOpen(false)}
                        className="rounded-full bg-[#75bec4] px-5 py-2 font-['Poppins'] text-xs font-semibold text-[#052d45] hover:bg-[#86d0d6] cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 2: Checkout Confirmation */}
              {checkoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                  <div className="w-full max-w-md rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 shadow-2xl">
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      Confirm Checkout
                    </h3>
                    <p className="mt-2 font-['Poppins'] text-sm text-[#9bbec7]">
                      Confirm this sale transaction for{" "}
                      <strong className="font-semibold text-[#73c4ca]">
                        {formatPeso(total)}
                      </strong>
                      ?
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutOpen(false)}
                        className="rounded-full border border-sky-100/15 px-4 py-2 font-['Poppins'] text-xs text-[#89afb9] hover:text-[#d9ecef] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={checkout}
                        className="rounded-full bg-[#75bec4] px-5 py-2 font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#86d0d6] cursor-pointer"
                      >
                        Confirm and Show Receipt
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 3: Receipt Dialog */}
              {receipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                  <div className="w-full max-w-md rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 shadow-2xl">
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      Transaction Receipt
                    </h3>
                    <p className="mt-1 font-['Poppins'] text-xs text-[#89afb9]">
                      Cashier:{" "}
                      {receipt.soldBy?.staffName || user?.role || "Staff"} ·{" "}
                      {new Date(receipt.createdAt).toLocaleString()}
                    </p>

                    <div className="mt-4 max-h-56 space-y-2 overflow-y-auto border-t border-b border-sky-100/10 py-3">
                      {receipt.items.map((item) => (
                        <div
                          key={item.itemId}
                          className="flex justify-between font-['Poppins'] text-xs text-[#d9ecef]"
                        >
                          <span>
                            {item.name} x{item.quantity}
                          </span>
                          <span className="font-medium text-[#73c4ca]">
                            {formatPeso(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 space-y-1 font-['Poppins'] text-xs text-[#9bbec7]">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatPeso(receipt.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>{formatPeso(receipt.discount)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-[#d9ecef]">
                        <span>Total Paid</span>
                        <span className="font-['Fraunces'] text-base font-bold text-[#73c4ca]">
                          {formatPeso(receipt.total)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={printReceipt}
                        className="rounded-full bg-[#75bec4] px-5 py-2 font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#86d0d6] cursor-pointer"
                      >
                        Print Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceipt(null)}
                        className="rounded-full border border-sky-100/15 px-4 py-2 font-['Poppins'] text-xs text-[#89afb9] hover:text-[#d9ecef] cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. SALES */}
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

          {/* 6. LEAVE NOTE */}
          {activePage === "leave-note" && (
            <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
              <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                Leave Note for Next Shift
              </h3>
              <p className="mt-0.5 font-['Poppins'] text-xs text-[#9bbec7]">
                Communicate shift events, feeding instructions, and tasks with
                co-workers.
              </p>

              <form className="mt-5 space-y-4" onSubmit={addNote}>
                <div>
                  <label className="block font-['Poppins'] text-[10px] font-semibold uppercase tracking-wider text-[#89afb9]">
                    Note Description
                  </label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    required
                    rows={4}
                    placeholder="Post an update for the next shift or owner..."
                    className="mt-1 w-full rounded-xl border border-sky-100/15 bg-white/[.06] p-3.5 font-['Poppins'] text-sm text-[#d9ecef] outline-none transition focus:border-[#73c4ca]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#86d0d6] cursor-pointer"
                  >
                    Add Note
                  </button>
                </div>
              </form>

              <div className="mt-8 border-t border-sky-100/10 pt-5">
                <h4 className="font-['Poppins'] text-xs font-semibold uppercase tracking-wider text-[#73c4ca]">
                  Announcement Board
                </h4>
                <div className="mt-3 space-y-2">
                  {notes.length === 0 ? (
                    <p className="font-['Poppins'] text-xs text-[#7fa7ae]">
                      No announcements have been posted.
                    </p>
                  ) : (
                    notes.map((item) => (
                      <div
                        key={item._id}
                        className="rounded-xl border border-sky-100/[.08] bg-white/[.03] p-3.5 font-['Poppins'] text-xs text-[#c9e1e5]"
                      >
                        {item.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. ANNOUNCEMENTS */}
          {activePage === "announcements" && (
            <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
              <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                Announcements
              </h3>
              <p className="mt-0.5 font-['Poppins'] text-xs text-[#9bbec7]">
                Bulletins from management and scheduled tank maintenance.
              </p>

              <div className="mt-5 space-y-3">
                {notes.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 font-['Poppins'] text-xs text-[#d9ecef]"
                  >
                    <span className="font-semibold text-[#73c4ca]">
                      {item.authorId?.staffName ||
                        item.authorId?.ownerName ||
                        "Unknown sender"}{" "}
                      |{" "}
                      {item.authorId?.role === "Owner"
                        ? "Owner"
                        : item.authorId?.staffPosition || "Staff"}
                      :
                    </span>{" "}
                    {item.text}
                  </div>
                ))}

                {tanks
                  .filter((tank) => tank.nextMaintenance)
                  .map((tank) => (
                    <div
                      key={`maintenance-${tank._id}`}
                      className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-4 font-['Poppins'] text-xs text-[#d9ecef]"
                    >
                      <span className="font-semibold text-amber-200">
                        Scheduled maintenance:
                      </span>{" "}
                      {tank.name} maintenance scheduled for{" "}
                      <span className="font-bold text-amber-100">
                        {new Date(tank.nextMaintenance).toLocaleDateString()}
                      </span>
                    </div>
                  ))}

                {notes.length === 0 &&
                  tanks.filter((t) => t.nextMaintenance).length === 0 && (
                    <p className="font-['Poppins'] text-xs text-[#7fa7ae]">
                      No active bulletins or upcoming maintenance schedules.
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* 8. SETTINGS — styled to match the Owner settings page */}
          {activePage === "settings" && (
            <div className="grid gap-6 pb-6">
              {/* Header */}
              <div className="flex flex-col justify-between gap-3 border-b border-sky-100/10 pb-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="font-['Fraunces'] text-2xl sm:text-3xl font-medium text-[#d9ecef]">
                    Settings
                  </h2>
                  <p className="mt-1 font-['Poppins'] text-xs sm:text-sm text-[#9bbec7]">
                    View your account details, security tips, and system
                    information.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-['Poppins'] text-xs font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    Master Staff
                  </span>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsTab("profile")}
                  className={settingsTabClass("profile")}
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("security")}
                  className={settingsTabClass("security")}
                >
                  Account Security
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("about")}
                  className={settingsTabClass("about")}
                >
                  About
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("contact")}
                  className={settingsTabClass("contact")}
                >
                  Contact & Support
                </button>
              </div>

              {/* TAB: PROFILE */}
              {settingsTab === "profile" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-1">
                    <div className="flex flex-col items-center text-center">
                      <span className="grid h-20 w-20 place-items-center rounded-full bg-[#75bec4]/20 font-['Poppins'] text-3xl font-semibold text-[#bce9e9] shadow-inner">
                        {(user?.staffName || user?.email || "S")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      <h3 className="mt-4 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                        {user?.staffName || "Staff Member"}
                      </h3>
                      <p className="font-['Poppins'] text-xs text-[#7fa7ae]">
                        {user?.email || "staff@fishonitory.com"}
                      </p>
                      <span className="mt-3 rounded-full border border-sky-100/15 bg-white/[.06] px-3 py-1 font-['Poppins'] text-[0.7rem] font-medium text-[#73c4ca]">
                        {user?.staffPosition || "Operations Staff"}
                      </span>
                    </div>

                    <div className="mt-6 border-t border-sky-100/10 pt-4 font-['Poppins'] text-xs text-[#9abcc5] space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-[#6f9ca5]">Position</span>
                        <span className="font-medium text-[#d9ecef]">
                          {user?.staffPosition || "Operations Staff"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6f9ca5]">Account Role</span>
                        <span className="font-medium text-[#73c4ca]">
                          {user?.role === "masterStaff"
                            ? "Master Staff"
                            : user?.role || "Staff"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      Account Details
                    </h3>
                    <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                      Your staff credentials on record for this workspace.
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                        <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                          Full Name
                        </label>
                        <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                          {user?.staffName || "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                        <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                          Email Address
                        </label>
                        <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                          {user?.email || "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                        <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                          Position
                        </label>
                        <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                          {user?.staffPosition || "Operations Staff"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                        <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                          Account Role
                        </label>
                        <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                          {user?.role === "masterStaff"
                            ? "Master Staff"
                            : user?.role || "Staff"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-[#75bec4]/20 bg-[#75bec4]/10 p-4">
                      <h4 className="font-['Poppins'] text-xs font-semibold uppercase tracking-wider text-[#73c4ca]">
                        Staff Access Notice
                      </h4>
                      <p className="mt-1.5 font-['Poppins'] text-xs leading-relaxed text-[#c9e8e9]">
                        This account has access to daily operations — inventory,
                        tank updates, point of sale, and the announcement board.
                        Business tools, staff account management, and financial
                        reports remain owner-only.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ACCOUNT SECURITY */}
              {settingsTab === "security" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sky-100/10 pb-4">
                      <div>
                        <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                          Login & Attendance Credentials
                        </h3>
                        <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                          Your staff email and password are used for both the
                          Staff Time Clock and account sign-in.
                        </p>
                      </div>
                      <span className="rounded-full border border-sky-100/15 bg-white/[.05] px-3 py-1 font-['Poppins'] text-xs font-medium text-[#9bbec7]">
                        Managed by Owner
                      </span>
                    </div>

                    <p className="mt-5 font-['Poppins'] text-xs leading-relaxed text-[#c9e1e5]">
                      Password resets and two-factor authentication for staff
                      accounts are managed by the business owner. If you've
                      forgotten your password or need your authenticator reset,
                      contact your shift lead or the owner directly.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-1">
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      Security Best Practices
                    </h3>
                    <ul className="mt-4 space-y-3 font-['Poppins'] text-xs leading-relaxed text-[#9bbec7]">
                      <li className="flex gap-2">
                        <span className="text-[#73c4ca] font-bold">1.</span>
                        <span>
                          <strong>Lockout Protection:</strong> Accounts are
                          automatically locked for 5 minutes after 5 consecutive
                          failed login attempts.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#73c4ca] font-bold">2.</span>
                        <span>
                          <strong>Keep It Personal:</strong> Never share your
                          login with other staff — each clock-in and clock-out
                          is tied to your own account.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#73c4ca] font-bold">3.</span>
                        <span>
                          <strong>Session Expiry:</strong> Always click{" "}
                          <em>Logout</em> before leaving public or shared shop
                          terminals.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB: ABOUT */}
              {settingsTab === "about" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
                    <h3 className="font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
                      About Fishonitory
                    </h3>
                    <p className="mt-2 font-['Poppins'] text-xs sm:text-sm leading-relaxed text-[#9bbec7]">
                      This section is still In progress.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-1">
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      System Information
                    </h3>
                    <div className="mt-4 space-y-3 font-['Poppins'] text-xs text-[#9bbec7]">
                      <div className="flex justify-between border-b border-sky-100/10 pb-2">
                        <span>Version</span>
                        <span className="font-mono text-[#d9ecef]">
                          v1.0.0 (Final)
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-sky-100/10 pb-2">
                        <span>Release Type</span>
                        <span className="text-emerald-300">Production</span>
                      </div>
                      <div className="flex justify-between border-b border-sky-100/10 pb-2">
                        <span>Frontend</span>
                        <span className="text-[#d9ecef]">
                          React 19 + Tailwind v4
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-sky-100/10 pb-2">
                        <span>Backend</span>
                        <span className="text-[#d9ecef]">
                          Node.js + Express API
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Database</span>
                        <span className="text-[#d9ecef]">MongoDB Atlas</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CONTACT & SUPPORT */}
              {settingsTab === "contact" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)] lg:col-span-2">
                    <h3 className="font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">
                      Help & Support Center
                    </h3>
                    <p className="mt-2 font-['Poppins'] text-xs sm:text-sm text-[#9bbec7]">
                      This section is still In progress.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activePage === "time-clock" && (
            <div className="mx-auto w-full max-w-2xl rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100/10 pb-4">
                <div>
                  <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[.16em] text-[#73c4ca]">
                    Staff attendance
                  </p>
                  <h3 className="mt-1 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                    Staff Time Clock
                  </h3>
                </div>
                <span className="rounded-full border border-sky-100/15 bg-white/[.04] px-3 py-1 font-['Poppins'] text-xs text-[#73c4ca]">
                  {currentTime.toLocaleTimeString("en-PH", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {/* Side info panel */}
                <div className="flex flex-col justify-between rounded-xl border border-sky-100/[.08] bg-white/[.03] p-5">
                  <div>
                    <h4 className="mt-4 font-['Fraunces'] text-lg font-medium text-[#d9ecef]">
                      {currentTime.toLocaleDateString("en-PH", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </h4>
                    <p className="mt-2 font-['Poppins'] text-xs leading-relaxed text-[#9bbec7]">
                      Use your own staff email and password to clock in when
                      your shift starts, and clock out when it ends. This keeps
                      attendance records accurate for payroll and scheduling.
                    </p>
                  </div>
                  <p className="mt-4 font-['Poppins'] text-[11px] text-[#6f9ca5]">
                    Having trouble logging your time? Let the owner or your
                    shift lead know.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                {/* Form */}
                <div className="rounded-xl border border-sky-100/[.08] bg-white/[.03] p-5">
                  <div className="grid gap-4">
                    <label className="block font-['Poppins'] text-[10px] font-semibold uppercase tracking-wider text-[#89afb9]">
                      Staff email
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="you@fishonitory.com"
                        value={timeClock.email}
                        onChange={(event) =>
                          setTimeClock((value) => ({
                            ...value,
                            email: event.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-sky-100/15 bg-white/[.06] px-3.5 py-3 font-['Poppins'] text-sm font-normal normal-case text-[#d9ecef] outline-none transition-colors placeholder:text-[#6d8b92] focus:border-[#73c4ca] focus:bg-white/[.09] focus:ring-2 focus:ring-[#73c4ca]/25"
                      />
                    </label>

                    <label className="block font-['Poppins'] text-[10px] font-semibold uppercase tracking-wider text-[#89afb9]">
                      Password
                      <input
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={timeClock.password}
                        onChange={(event) =>
                          setTimeClock((value) => ({
                            ...value,
                            password: event.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-sky-100/15 bg-white/[.06] px-3.5 py-3 font-['Poppins'] text-sm font-normal normal-case text-[#d9ecef] outline-none transition-colors placeholder:text-[#6d8b92] focus:border-[#73c4ca] focus:bg-white/[.09] focus:ring-2 focus:ring-[#73c4ca]/25"
                      />
                    </label>

                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        disabled={timeClockBusy}
                        onClick={() => submitTimeClock("clock-in")}
                        className="flex-1 rounded-xl bg-[#75bec4] py-3.5 text-center font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#86d0d6] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      >
                        {timeClockBusy ? "Clocking in…" : "Clock In"}
                      </button>
                      <button
                        type="button"
                        disabled={timeClockBusy}
                        onClick={() => submitTimeClock("clock-out")}
                        className="flex-1 rounded-xl border border-sky-100/15 bg-white/[.04] py-3.5 text-center font-['Poppins'] text-sm font-semibold text-[#d9ecef] transition hover:border-[#73c4ca]/40 hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      >
                        {timeClockBusy ? "Clocking out…" : "Clock Out"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default StaffDashboard;
