import DashboardSidebar from "../../components/DashboardSidebar.jsx";
import DashboardHeader from "../../components/DashboardHeader.jsx";
import { useEffect, useState } from "react";
import { formatPhoneInput } from "../shared/phoneUtils.js";
import { useAuth } from "../shared/useAuth.js";
import Sales from "../shared/Sales.jsx";
import Orders from "../shared/Orders.jsx";
import AboutContactPanel from "../shared/AboutContactPanel.jsx";
import SalesSummary from "../shared/SalesSummary.jsx";
import MortalityReportForm from "../../components/MortalityReportForm.jsx";
import { formatPeso, getDefaultSalesRange } from "../shared/salesUtils.js";
import { API_URL } from "../../config.js";
import "../../css/owner-dashboard-layout.css";
import NotificationBell from "../shared/NotificationBell.jsx";
import DashboardToast from "../../components/DashboardToast.jsx";
import { confirmOceanicAction, oceanicNotice, showOceanicLogoutConfirm } from "../../utils/oceanicSwal.js";
import Notes from "../owner/Notes.jsx";
import PlatformNoticeBanner from "../owner/PlatformNoticeBanner.jsx";

// Choices para sa mga fish tank statuses na pwedeng i-update ng staff sa dashboard.
const tankStatuses = [
  "Under Maintenance",
  "Available",
];

function MillisecondClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 50);
    return () => window.clearInterval(timer);
  }, []);

  return time.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

const formatMaintenanceDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const todayLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

// Function to make API requests with authentication headers
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(sessionStorage.getItem("fishonitory_auth_token")
        ? { Authorization: `Bearer ${sessionStorage.getItem("fishonitory_auth_token")}` }
        : {}),
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
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

// Sidebar section: title, optional description, then indented menu items.
// Contrast on the sidebar background (#021d2e): menu items #d4eaec 13.8:1,
// title #8fc5cb 9.1:1, description #8fb3ba 7.7:1 (all WCAG AAA).
// On mobile the sidebar is a horizontal strip, so the heading is hidden and
// the wrappers use `display: contents` to keep buttons as direct row items.

// Staff dashboard component
function StaffDashboard() {
  const { user, authReady, logout, updateUser } = useAuth();

  const [activePage, setActivePage] = useState("overview");
  const [settingsTab, setSettingsTab] = useState("profile");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [checkoutMode, setCheckoutMode] = useState("sale");
  const [orderDetails, setOrderDetails] = useState({
    deliveryMethod: "pickup",
    courierName: "",
    requestedDate: todayLocal(),
  });

  const [fish, setFish] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [openStaffShifts, setOpenStaffShifts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [platformNotices, setPlatformNotices] = useState([]);
  const [platformNoticeModalOpen, setPlatformNoticeModalOpen] = useState(true);
  const [platformNoticeForceOpen, setPlatformNoticeForceOpen] = useState(false);
  const [notePermissions, setNotePermissions] = useState({ canModerate: false, userId: "" });
  const [sales, setSales] = useState([]);
  const [mortality, setMortality] = useState([]);
  const [salesRange, setSalesRange] = useState({
    startDate: "",
    endDate: "",
  });

  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customerDetails, setCustomerDetails] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });
  const [customerDetailsTouched, setCustomerDetailsTouched] = useState({
    customerName: false,
    customerEmail: false,
    customerPhone: false,
  });
  const customerNameValue = customerDetails.customerName.trim();
  const customerEmailValue = customerDetails.customerEmail.trim();
  const customerPhoneValue = customerDetails.customerPhone.replace(/\s/g, "");
  const customerNameValid = customerNameValue.length >= 2 && customerNameValue.length <= 120;
  const customerEmailValid =
    customerEmailValue.length <= 254 &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(customerEmailValue);
  const customerPhoneValid = /^\+[1-9]\d{6,14}$/.test(customerPhoneValue);
  const customerDetailsValid =
    customerNameValid && customerEmailValid && customerPhoneValid;
  const courierNameValue = orderDetails.courierName.trim();
  const orderDetailsValid =
    orderDetails.deliveryMethod !== "courier" ||
    (courierNameValue.length > 0 && courierNameValue.length <= 80);
  const requestedDateValid =
    /^\d{4}-\d{2}-\d{2}$/.test(orderDetails.requestedDate) &&
    orderDetails.requestedDate >= todayLocal();

  const [toastNotice, setToastNotice] = useState(null);
  const [timeClock, setTimeClock] = useState({ email: "", password: "" });
  const [timeClockBusy, setTimeClockBusy] = useState(false);
  const [timeClockAction, setTimeClockAction] = useState("");
  const [profileDraftEdits, setProfileDraftEdits] = useState({});
  const profileDraft = {
    staffName: profileDraftEdits.staffName ?? user?.staffName ?? "",
    phoneNumber: profileDraftEdits.phoneNumber ?? user?.phoneNumber ?? "",
  };
  const [profileSaving, setProfileSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const notify = (type, title) => setToastNotice(title ? { type, title } : null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toastNotice) return undefined;
    const timer = window.setTimeout(() => setToastNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastNotice]);

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
      const [fishData, tankData, noteData, salesData, mortalityData, noticeData, shiftData] = await Promise.all([
        apiRequest("/fish"),
        apiRequest("/store/tanks"),
        apiRequest("/notes"),
        apiRequest("/sales"),
        apiRequest("/operations/mortality"),
        apiRequest("/platform-notices"),
        apiRequest("/attendance/shift-reminders").catch(() => ({ openShifts: [] })),
      ]);

      setFish(fishData.fish);
      setTanks(tankData.tanks);
      setNotes(noteData.notes);
      setPlatformNotices(noticeData.notices || []);
      setOpenStaffShifts(shiftData.openShifts || []);
      setNotePermissions(noteData.permissions || { canModerate: false, userId: "" });
      setSales(salesData.sales);
      setMortality(mortalityData.records || []);
      setSalesRange((currentRange) => {
        if (currentRange.startDate && currentRange.endDate) {
          return currentRange;
        }

        return getDefaultSalesRange(salesData.sales);
      });
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  const refreshWorkspace = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await loadData(); }
    finally { setRefreshing(false); }
  };

  const submitMortality = async (payload) => {
    try {
      const result = await apiRequest("/operations/mortality", {
        method: "POST",
        body: payload,
      });
      notify("success", result.message);
      await loadData();
      return true;
    } catch (requestError) {
      notify("error", requestError.message);
      return false;
    }
  };

  const submitTimeClock = async (action) => {
    if (!timeClock.email || !timeClock.password)
      return notify("error",
        "Enter the staff email and password to record attendance.",
      );
    setTimeClockBusy(true);
    setTimeClockAction(action);
    notify(null, "");
    try {
      const response = await fetch(`${API_URL}/attendance/staff-time-clock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionStorage.getItem("fishonitory_auth_token")
            ? { Authorization: `Bearer ${sessionStorage.getItem("fishonitory_auth_token")}` }
            : {}),
          "X-Session-Role": "masterStaff",
        },
        credentials: "include",
        body: JSON.stringify({ ...timeClock, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message || "Could not record attendance.");
      notify("success", data.message);
      setTimeClock({ email: "", password: "" });
    } catch (requestError) {
      notify("error", requestError.message);
    } finally {
      setTimeClockBusy(false);
      setTimeClockAction("");
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

  const addNote = async (payload) => {
    try {
      await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify({
          text: payload.text,
          visibility: payload.visibility || "public",
          isTask: Boolean(payload.isTask),
          taskStatus: payload.isTask ? payload.taskStatus || "pending" : "pending",
          dueDate: payload.isTask ? payload.dueDate || null : null,
          assignedTo: payload.isTask ? payload.assignedTo || null : null,
        }),
      });

      notify("success", "Your announcement has been posted.");
      await loadData();
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  const updateNote = async (id, changes) => {
    try {
      const data = await apiRequest(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setNotes((current) => current.map((item) => item._id === id ? data.note : item));
      notify("success", "Announcement updated.");
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  const deleteNote = async (id) => {
    try {
      await apiRequest(`/notes/${id}`, { method: "DELETE" });
      setNotes((current) => current.filter((item) => item._id !== id));
      notify("success", "Announcement deleted.");
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  const saveStaffProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const data = await apiRequest("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(profileDraft),
      });
      const savedProfile = data.profile || profileDraft;
      setProfileDraftEdits((current) => ({ ...current, ...profileDraft, ...savedProfile }));
      updateUser(savedProfile);
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      });
      setProfileSaving(false);
      await oceanicNotice("Profile updated", "Your profile changes have been saved.", "success", { tone: "success" });
    } catch (requestError) {
      notify("error", requestError.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const updateTank = async (id, status) => {
    try {
      await apiRequest(`/store/tanks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      notify("success", "Tank status updated.");
      await loadData();
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  const checkout = async () => {
    if (!cart.length) {
      return;
    }
    if (!customerNameValid) {
      notify("error", "Enter a customer name between 2 and 120 characters.");
      return;
    }
    if (!customerEmailValid) {
      notify("error", "Enter a valid customer email address.");
      return;
    }
    if (!customerPhoneValid) {
      notify("error", "Enter a valid phone number in international format, such as +639171234567.");
      return;
    }
    if (checkoutMode === "order" && !orderDetailsValid) {
      notify("error", "Enter the courier name for courier deliveries.");
      return;
    }
    if (checkoutMode === "order" && !requestedDateValid) {
      notify("error", "Choose the customer pickup or delivery date.");
      return;
    }

    try {
      const isOrder = checkoutMode === "order";
      const data = await apiRequest(isOrder ? "/orders" : "/sales", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((item) => ({
            itemId: item._id,
            name: item.name,
            quantity: item.quantity,
          })),
          discount,
          customerName: customerNameValue,
          customerEmail: customerEmailValue,
          customerPhone: customerPhoneValue,
          ...(isOrder ? {
            ...orderDetails,
            requestedDate: new Date(`${orderDetails.requestedDate}T12:00:00`).toISOString(),
          } : {}),
        }),
      });

      setReceipt({ ...(isOrder ? data.order : data.sale), receiptKind: isOrder ? "order" : "sale" });
      setCheckoutOpen(false);
      setCart([]);
      setDiscount(0);
      setCustomerDetails({ customerName: "", customerEmail: "", customerPhone: "" });
      setCustomerDetailsTouched({ customerName: false, customerEmail: false, customerPhone: false });
      setCheckoutMode("sale");
      setOrderDetails({ deliveryMethod: "pickup", courierName: "", requestedDate: todayLocal() });
      notify("success", isOrder ? "Customer order created and stock reserved." : "Sale completed.");
      await loadData();
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  const updateOrderStatus = async (saleId, deliveryStatus) => {
    try {
      const data = await apiRequest(`/sales/${saleId}`, {
        method: "PATCH",
        body: JSON.stringify({ deliveryStatus }),
      });
      notify("success", data.message || "Order status updated.");
      await loadData();
    } catch (requestError) {
      notify("error", requestError.message);
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
          <h1>Fishonitory {receipt.receiptKind === "order" ? "Order Confirmation" : "Receipt"}</h1>
          <p>
            Cashier: ${escapeHtml(user?.staffName || user?.role || "Staff")}<br />
            Customer: ${escapeHtml(receipt.customerName || "Walk-in Customer")}<br />
            Email: ${escapeHtml(receipt.customerEmail || "-")}<br />
            Phone: ${escapeHtml(receipt.customerPhone || "-")}<br />
            Date: ${new Date(receipt.createdAt).toLocaleString()}
            ${receipt.receiptKind === "order" ? `<br />Fulfillment: ${escapeHtml(receipt.deliveryMethod)}<br />Requested date: ${new Date(receipt.requestedDate).toLocaleDateString()}` : ""}
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

  const settingsTabClass = (tab) =>
    `rounded-xl px-4 py-2 font-['Poppins'] text-xs sm:text-sm font-medium transition cursor-pointer ${
      settingsTab === tab
        ? "bg-[#65c9c9] text-[#073047] shadow-sm"
        : "bg-white/[.04] text-[#8fb7be] hover:bg-white/[.08] hover:text-[#d9ecef]"
    }`;

  return (
    <main className="owner-dashboard-main box-border flex h-[100dvh] min-h-0 w-full flex-col md:flex-row overflow-hidden bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] text-[#c9e1e5]">
      <DashboardSidebar
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onNavigate={(page) => { setActivePage(page); setSidebarOpen(false); }}
        navigationLabel="Staff dashboard navigation"
        brandSubtitle="Staff workspace"
        refreshLabel="Refresh Fishonitory workspace"
        onRefresh={refreshWorkspace}
        refreshing={refreshing}
        groups={[
          { items: [{ page: "overview", label: "Overview" }] },
          { title: "Shift and farm care", description: "Clock in, check stock, and update tanks", items: [{ page: "time-clock", label: "Staff Time Clock" }, { page: "inventory", label: "Fish & Feed Inventory" }, { page: "tanks", label: "Tank Updates" }, { page: "mortality", label: "Mortality Reports" }] },
          { title: "Sales desk", description: "Point of sale, orders, and sales", items: [{ page: "calculator", label: "Point of Sale (POS)" }, { page: "orders", label: "Orders" }, { page: "sales", label: "Sales" }] },
          { title: "Team board", description: "Post notes and read announcements", items: [{ page: "leave-note", label: "Post to Board" }, { page: "announcements", label: "Announcements" }] },
          { title: "Preferences", items: [{ page: "settings", label: "Settings" }] },
        ]}
        identity={{ avatar: profileDraft.staffName || user?.email || "S", title: profileDraft.staffName || user?.email || "Master Staff", subtitle: user?.staffPosition || "Operations Staff", loading: profileSaving }}
        onIdentityClick={() => { setActivePage("settings"); setSidebarOpen(false); }}
        onLogout={async () => {
          let openShifts = [];
          try {
            const shiftData = await apiRequest("/attendance/shift-reminders");
            openShifts = shiftData.openShifts || [];
          } catch {
            // Keep the normal logout path available if the reminder check is unavailable.
          }
          if (openShifts.length) {
            const names = openShifts.map((shift) => shift.staffName).join(", ");
            const confirmed = await confirmOceanicAction({
              title: "Staff still need to clock out",
              text: `${names} ${openShifts.length === 1 ? "has" : "have"} not clocked out. Are you sure you want to log out?`,
              confirmText: "Log out anyway",
              cancelText: "Stay signed in",
              tone: "danger",
            });
            if (confirmed) {
              await logout();
              window.location.replace("/");
            }
            return;
          }
          const result = await showOceanicLogoutConfirm(async () => {
            await logout();
            window.location.replace("/");
          });
          if (result.isConfirmed) {
            await logout();
            window.location.replace("/");
          }
        }}
      />

      {/* MAIN WORKSPACE AREA */}
      <div className="owner-workspace flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardToast notice={toastNotice} />
        <DashboardHeader title="OPERATIONS CONTROL CENTER" currentTime={currentTime}>
<NotificationBell
              notes={notes}
              fish={fish}
              tanks={tanks}
              onNavigate={setActivePage}
              announcementPage="announcements"
              viewerRole="masterStaff"
              viewerId={user?.id}
              staffClockoutReminders={openStaffShifts}
              platformNotices={platformNotices}
              onOpenPlatformNotice={() => { setPlatformNoticeForceOpen(true); setPlatformNoticeModalOpen(true); }}
            />
      </DashboardHeader>
        <div key={activePage} className="dashboard-page-transition min-h-0 flex-1 overflow-y-auto px-0 py-6 sm:px-5 lg:px-5 lg:py-8">
        {platformNoticeModalOpen && <PlatformNoticeBanner notices={platformNotices} viewerId={user?.id || user?._id || user?.email} viewerRole={user?.role} forceShow={platformNoticeForceOpen} onClose={() => { setPlatformNoticeModalOpen(false); setPlatformNoticeForceOpen(false); }} />}
        {/* DASHBOARD PAGE CONTENT */}
        <section className="mx-auto grid w-full max-w-7xl gap-6">
          {/* 1. OVERVIEW */}
          {activePage === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="dashboard-stat-card rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-4 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#b0cbd1]">
                    Fish Species
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#d9ecef]">
                    {fishTypesCount}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#a6c3cb]">
                    Unique fish listed
                  </small>
                </article>

                <article className="dashboard-stat-card rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-4 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#b0cbd1]">
                    Total Fish Stock
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#d9ecef]">
                    {fishInventory.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    )}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#a6c3cb]">
                    Available live units
                  </small>
                </article>

                <article className="dashboard-stat-card rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-4 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#b0cbd1]">
                    Food Supplies
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#d9ecef]">
                    {food.reduce((sum, item) => sum + item.quantity, 0)}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#a6c3cb]">
                    Feed inventory units
                  </small>
                </article>

                <article className="dashboard-stat-card rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-4 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
                  <span className="font-['Poppins'] text-xs font-medium uppercase tracking-[0.12em] text-[#b0cbd1]">
                    Total Tanks
                  </span>
                  <strong className="mt-1 block font-['Fraunces'] text-4xl font-bold text-[#d9ecef]">
                    {tanks.length}
                  </strong>
                  <small className="font-['Poppins'] text-[11px] text-[#a6c3cb]">
                    Active store tanks
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

          {activePage === "mortality" && (
            <div className="space-y-6">
              <MortalityReportForm
                fish={fish}
                tanks={tanks}
                staff={[user]}
                user={user}
                onSubmit={submitMortality}
              />
              <section className="overflow-hidden rounded-2xl border border-sky-100/10 bg-[#062d48]/80">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100/10 px-4 py-4 sm:px-5">
                  <div>
                    <h3 className="m-0 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      Recent mortality reports
                    </h3>
                    <p className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                      Reports for this store, newest first.
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 font-['Poppins'] text-xs text-amber-100">
                    {mortality.length} reports
                  </span>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 sm:p-4">
                  {mortality.length ? mortality.slice(0, 30).map((item) => (
                    <article key={item._id} className="min-w-0 rounded-xl border border-sky-100/[.08] bg-white/[.025] p-4 font-['Poppins'] text-xs text-[#b7d2d7]">
                      <div className="mb-3 flex min-w-0 items-start justify-between gap-2 border-b border-sky-100/[.07] pb-3">
                        <div className="min-w-0">
                          <p className="m-0 break-words text-[#89afb9]">{new Date(item.recordedAt).toLocaleString("en-PH")}</p>
                          <p className="mt-1 break-words text-sm font-medium text-[#d9ecef]">{item.species || item.fishName || "Unknown species"}</p>
                        </div>
                        <strong className="shrink-0 text-rose-200">{item.quantity} dead</strong>
                      </div>
                      <dl className="m-0 grid min-w-0 grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="min-w-0"><dt className="text-[#789faa]">Recorded by</dt><dd className="m-0 break-words">{item.recordedBy?.staffName || item.recordedBy?.ownerName || "Unknown"}</dd></div>
                        <div className="min-w-0"><dt className="text-[#789faa]">Facility</dt><dd className="m-0 break-words">{item.tankId?.name || "—"}</dd></div>
                        <div className="min-w-0"><dt className="text-[#789faa]">Life stage</dt><dd className="m-0 break-words">{item.lifeStage || "—"}</dd></div>
                        <div className="min-w-0"><dt className="text-[#789faa]">Batch / lot</dt><dd className="m-0 break-words">{item.batchNumber || "—"}</dd></div>
                        <div className="min-w-0"><dt className="text-[#789faa]">Dead / starting stock</dt><dd className="m-0 break-words">{item.quantity} / {item.initialStockCount ?? "—"}</dd></div>
                        <div className="min-w-0"><dt className="text-[#789faa]">Cause</dt><dd className="m-0 break-words">{item.suspectedCause || item.reason || "—"}</dd></div>
                        <div className="min-w-0"><dt className="text-[#789faa]">Treatment</dt><dd className="m-0 break-words">{item.treatmentGiven || "None"}</dd></div>
                        <div className="min-w-0"><dt className="text-[#789faa]">Disposal</dt><dd className="m-0 break-words">{item.disposalMethod || "—"}</dd></div>
                        <div className="min-w-0"><dt className="text-[#789faa]">Signs observed</dt><dd className="m-0 break-words">{item.signsObserved?.length ? item.signsObserved.join(", ") : "—"}</dd></div>
                        {item.remarks && <div className="min-w-0 sm:col-span-2 xl:col-span-3"><dt className="text-[#789faa]">Remarks</dt><dd className="m-0 break-words">{item.remarks}</dd></div>}
                      </dl>
                    </article>
                  )) : <p className="m-0 px-1 py-3 text-sm text-[#789faa]">No mortality reports have been recorded.</p>}
                </div>
              </section>
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
              {Array.isArray(tanks) && tanks.length > 0 ? (
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
                          {formatMaintenanceDate(tank.nextMaintenance)}
                        </span>
                      </p>
                    )}
                  </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-sky-100/[.08] bg-white/[.03] px-4 py-8 text-center font-['Poppins'] text-sm text-[#9bbec7]">
                  No records here.
                </p>
              )}
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

                  <div className="space-y-2 border-t border-sky-100/10 pt-3">
                    <div className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#89afb9]">
                      Customer details
                    </div>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      aria-label="Customer name"
                      aria-invalid={customerDetailsTouched.customerName && !customerNameValid}
                      onBlur={() => setCustomerDetailsTouched((previous) => ({ ...previous, customerName: true }))}
                      value={customerDetails.customerName}
                      onChange={(event) =>
                        {
                          setCustomerDetails((previous) => ({ ...previous, customerName: event.target.value }));
                          setCustomerDetailsTouched((previous) => ({ ...previous, customerName: true }));
                        }
                      }
                      placeholder="Customer name"
                      className={`w-full rounded-lg border ${!customerDetailsTouched.customerName || customerNameValid ? "border-sky-100/15" : "border-red-300/40"} bg-white/[.07] px-2.5 py-2 font-['Poppins'] text-xs text-[#d9ecef] outline-none focus:border-[#73c4ca]`}
                    />
                    {customerDetailsTouched.customerName && !customerNameValid && <p className="text-[11px] text-red-200">{customerNameValue ? "Use 2–120 characters for the customer name." : "Customer name is required."}</p>}
                    <input
                      type="email"
                      required
                      maxLength={254}
                      aria-label="Customer email"
                      aria-invalid={customerDetailsTouched.customerEmail && !customerEmailValid}
                      onBlur={() => setCustomerDetailsTouched((previous) => ({ ...previous, customerEmail: true }))}
                      value={customerDetails.customerEmail}
                      onChange={(event) =>
                        {
                          setCustomerDetails((previous) => ({ ...previous, customerEmail: event.target.value }));
                          setCustomerDetailsTouched((previous) => ({ ...previous, customerEmail: true }));
                        }
                      }
                      placeholder="customer@email.com"
                      className={`w-full rounded-lg border ${!customerDetailsTouched.customerEmail || customerEmailValid ? "border-sky-100/15" : "border-red-300/40"} bg-white/[.07] px-2.5 py-2 font-['Poppins'] text-xs text-[#d9ecef] outline-none focus:border-[#73c4ca]`}
                    />
                    {customerDetailsTouched.customerEmail && !customerEmailValid && <p className="text-[11px] text-red-200">{customerEmailValue ? "Enter a valid email address." : "Customer email is required."}</p>}
                    <input
                      type="tel"
                      required
                      aria-label="Customer phone"
                      aria-invalid={customerDetailsTouched.customerPhone && !customerPhoneValid}
                      onBlur={() => setCustomerDetailsTouched((previous) => ({ ...previous, customerPhone: true }))}
                      value={customerDetails.customerPhone}
                      onChange={(event) =>
                        {
                          setCustomerDetails((previous) => ({ ...previous, customerPhone: formatPhoneInput(event.target.value) }));
                          setCustomerDetailsTouched((previous) => ({ ...previous, customerPhone: true }));
                        }
                      }
                      placeholder="+639171234567"
                      className={`w-full rounded-lg border ${!customerDetailsTouched.customerPhone || customerPhoneValid ? "border-sky-100/15" : "border-red-300/40"} bg-white/[.07] px-2.5 py-2 font-['Poppins'] text-xs text-[#d9ecef] outline-none focus:border-[#73c4ca]`}
                    />
                    {customerDetailsTouched.customerPhone && !customerPhoneValid && <p className="text-[11px] text-red-200">{customerDetails.customerPhone.trim() ? "Use a valid international number, e.g. +639171234567." : "Customer phone is required."}</p>}
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
                  disabled={!cart.length || !customerDetailsValid}
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
                  <div className="w-full max-w-lg rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 shadow-2xl">
                    <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                      {checkoutMode === "order" ? "Create customer order" : "Confirm checkout"}
                    </h3>
                    <p className="mt-2 font-['Poppins'] text-sm text-[#9bbec7]">
                      {checkoutMode === "order" ? "Create an order for" : "Complete this sale for"}{" "}
                      <strong className="font-semibold text-[#73c4ca]">
                        {formatPeso(total)}
                      </strong>
                      {checkoutMode === "sale" ? "?" : ". Stock will be reserved until it is cancelled or fulfilled."}
                    </p>
                    <label className="mt-5 block font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                      Checkout type
                      <select value={checkoutMode} onChange={(event) => setCheckoutMode(event.target.value)} className="mt-1.5 w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3 py-2.5 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]">
                        <option value="sale">Point-of-sale sale · paid now</option>
                        <option value="order">Customer order · pickup or delivery</option>
                      </select>
                    </label>
                    {checkoutMode === "order" && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                          Fulfillment method
                          <select value={orderDetails.deliveryMethod} onChange={(event) => setOrderDetails((current) => ({ ...current, deliveryMethod: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3 py-2.5 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]">
                            <option value="pickup">Customer pickup</option>
                            <option value="rider">Rider delivery</option>
                            <option value="courier">Courier delivery</option>
                          </select>
                        </label>
                        <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf]">
                          {orderDetails.deliveryMethod === "pickup" ? "Customer pickup date" : "Requested delivery date"}
                          <input required type="date" min={todayLocal()} value={orderDetails.requestedDate} onChange={(event) => setOrderDetails((current) => ({ ...current, requestedDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3 py-2.5 text-sm text-[#d9ecef] outline-none [color-scheme:dark] focus:border-[#73c4ca]" />
                        </label>
                        {orderDetails.deliveryMethod === "courier" && <label className="font-['Poppins'] text-xs font-medium text-[#a9c8cf] sm:col-span-2">Courier name<input required value={orderDetails.courierName} onChange={(event) => setOrderDetails((current) => ({ ...current, courierName: event.target.value }))} placeholder="e.g. Lalamove or Grab" className="mt-1.5 w-full rounded-xl border border-sky-100/15 bg-[#062d48] px-3 py-2.5 text-sm text-[#d9ecef] outline-none focus:border-[#73c4ca]" /></label>}
                        <p className="text-xs text-[#9bbec7] sm:col-span-2">Customer name, valid email, and international phone number are required for checkout. Enter them in the order summary panel.</p>
                      </div>
                    )}
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutOpen(false)}
                        className="rounded-full border border-sky-100/15 bg-transparent px-4 py-2 font-['Poppins'] text-xs text-[#89afb9] hover:text-[#d9ecef] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!cart.length || !customerDetailsValid || (checkoutMode === "order" && (!orderDetailsValid || !requestedDateValid))}
                        onClick={checkout}
                        className="rounded-full bg-[#75bec4] px-5 py-2 font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#86d0d6] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {checkoutMode === "order" ? "Create order" : "Complete sale"}
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
                      {receipt.receiptKind === "order" ? "Customer Order" : "Transaction Receipt"}
                    </h3>
                    <p className="mt-1 font-['Poppins'] text-xs text-[#89afb9]">
                      Cashier:{" "}
                      {receipt.soldBy?.staffName || user?.role || "Staff"} ·{" "}
                      {new Date(receipt.createdAt).toLocaleString()}
                    </p>
                    {receipt.receiptKind === "order" && <p className="mt-2 rounded-lg border border-sky-100/10 bg-white/[.03] px-3 py-2 font-['Poppins'] text-xs text-[#b7d2d7]">{receipt.deliveryMethod === "pickup" ? "Pickup" : receipt.deliveryMethod === "rider" ? "Rider delivery" : `Courier delivery${receipt.courierName ? ` · ${receipt.courierName}` : ""}`} · Requested {new Date(receipt.requestedDate).toLocaleDateString("en-PH", { dateStyle: "medium" })}</p>}

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
                        <span>{receipt.receiptKind === "order" ? "Order Total · unpaid" : "Total Paid"}</span>
                        <span className="font-['Fraunces'] text-base font-bold text-[#73c4ca]">
                          {formatPeso(receipt.total)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-3 font-['Poppins'] text-xs text-[#9bbec7]">
                        <div className="font-semibold text-[#d9ecef]">
                          Customer details
                        </div>
                        <div className="mt-1">
                          Name: {receipt.customerName || "Walk-in Customer"}
                        </div>
                        <div>Email: {receipt.customerEmail || "-"}</div>
                        <div>Phone: {receipt.customerPhone || "-"}</div>
                      </div>
                      <div className="flex justify-end gap-3">
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
                </div>
              )}
            </div>
          )}

          {/* 5. ORDERS */}
          {activePage === "orders" && (
            <Orders request={apiRequest} onChanged={loadData} />
          )}
          {activePage === "orders-legacy" && (
            <div className="rounded-2xl border border-sky-100/10 bg-[#062d48]/80 p-6 shadow-[0_14px_35px_rgba(0,12,31,.14)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100/10 pb-4">
                <div>
                  <h3 className="font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                    Order Tracking
                  </h3>
                  <p className="mt-0.5 font-['Poppins'] text-xs text-[#9bbec7]">
                    Check customer pickups, deliveries, and pending orders.
                  </p>
                </div>
                <span className="rounded-full border border-sky-100/15 bg-white/[.04] px-3 py-1 font-['Poppins'] text-xs text-[#73c4ca]">
                  {sales.length} orders
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {sales.length === 0 ? (
                  <p className="font-['Poppins'] text-xs text-[#7fa7ae]">
                    No orders have been created yet.
                  </p>
                ) : (
                  sales.map((sale) => (
                    <div
                      key={sale._id}
                      className="rounded-xl border border-sky-100/[.08] bg-white/[.03] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-['Poppins'] text-xs uppercase tracking-[0.12em] text-[#73c4ca]">
                            {sale.customerName || "Walk-in Customer"}
                          </div>
                          <div className="mt-1 font-['Poppins'] text-xs text-[#9bbec7]">
                            {sale.customerEmail || "No email"} ·{" "}
                            {sale.customerPhone || "No phone"}
                          </div>
                          <div className="mt-1 font-['Poppins'] text-[11px] text-[#7fa7ae]">
                            {new Date(sale.createdAt).toLocaleString()} ·{" "}
                            {sale.items.length} product(s)
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {["pending", "picked-up", "delivered"].map(
                            (status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() =>
                                  updateOrderStatus(sale._id, status)
                                }
                                className={`rounded-full px-3 py-1.5 font-['Poppins'] text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
                                  sale.deliveryStatus === status
                                    ? "bg-[#75bec4] text-[#052d45]"
                                    : "border border-sky-100/15 bg-transparent text-[#9bbec7] hover:text-[#d9ecef]"
                                }`}
                              >
                                {status === "picked-up"
                                  ? "Picked up"
                                  : status === "delivered"
                                    ? "Delivered"
                                    : "Pending"}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 6. SALES */}
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

          {/* 7. LEAVE NOTE */}
          {activePage === "leave-note" && (
            <Notes notes={notes} permissions={notePermissions} onAddNote={addNote} onUpdateNote={updateNote} onDeleteNote={deleteNote} />
          )}
          {/* 8. ANNOUNCEMENTS */}
          {activePage === "announcements" && (
            <Notes notes={notes} permissions={notePermissions} onAddNote={addNote} onUpdateNote={updateNote} onDeleteNote={deleteNote} showComposer={false} />
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
                        {(profileDraft.staffName || user?.email || "S")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      <h3 className="mt-4 font-['Fraunces'] text-xl font-medium text-[#d9ecef]">
                        {profileDraft.staffName || "Staff Member"}
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
                      Update your name and contact number. Email, position, and role are managed by the owner.
                    </p>

                    <form onSubmit={saveStaffProfile} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <label className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-wider text-[#6f9ca5]">
                        Full Name
                        <input
                          value={profileDraft.staffName}
                          onChange={(event) => setProfileDraftEdits((current) => ({ ...current, staffName: event.target.value }))}
                          required
                          maxLength={100}
                          autoComplete="name"
                          className="mt-1.5 w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                        />
                      </label>
                      <label className="font-['Poppins'] text-[10px] font-semibold uppercase tracking-wider text-[#6f9ca5]">
                        Phone Number
                        <input
                          type="tel"
                          value={profileDraft.phoneNumber}
                          onChange={(event) => setProfileDraftEdits((current) => ({ ...current, phoneNumber: formatPhoneInput(event.target.value) }))}
                          required
                          maxLength={24}
                          autoComplete="tel"
                          placeholder="+639171234567"
                          className="mt-1.5 w-full rounded-xl border border-sky-100/10 bg-white/[.06] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#d9ecef] outline-none focus:border-[#73c4ca]"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="rounded-full bg-[#75bec4] px-5 py-2.5 font-['Poppins'] text-xs font-semibold text-[#052d45] transition hover:bg-[#86d0d6] disabled:cursor-wait disabled:opacity-60"
                      >
                        {profileSaving ? "Saving..." : "Save Profile"}
                      </button>
                    </form>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-sky-100/10 bg-white/[.03] p-4">
                        <label className="font-['Poppins'] text-[10px] font-semibold tracking-wider text-[#6f9ca5] uppercase">
                          Full Name
                        </label>
                        <p className="mt-1 font-['Poppins'] text-sm font-medium text-[#d9ecef]">
                          {profileDraft.staffName || "Not specified"}
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
                <AboutContactPanel section="about" />
              )}

              {/* TAB: CONTACT & SUPPORT */}
              {settingsTab === "contact" && (
                <AboutContactPanel section="contact" />
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
                  <MillisecondClock />
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
                        placeholder="*******"
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
                        {timeClockBusy && timeClockAction === "clock-in"
                          ? "Clocking in..."
                          : "Clock In"}
                      </button>
                      <button
                        type="button"
                        disabled={timeClockBusy}
                        onClick={() => submitTimeClock("clock-out")}
                        className="flex-1 rounded-xl border border-sky-100/15 bg-white/[.04] py-3.5 text-center font-['Poppins'] text-sm font-semibold text-[#d9ecef] transition hover:border-[#73c4ca]/40 hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      >
                        {timeClockBusy && timeClockAction === "clock-out"
                          ? "Clocking out..."
                          : "Clock Out"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}

export default StaffDashboard;
