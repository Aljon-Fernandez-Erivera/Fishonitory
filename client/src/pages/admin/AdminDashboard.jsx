import { useEffect, useState } from "react";
import { useAuth } from "../shared/useAuth.js";
import { API_URL } from "../../config.js";
import "../../css/owner-dashboard-layout.css";
import Swal from "sweetalert2";
import { showOceanicLogoutConfirm } from "../../utils/oceanicSwal.js";
import AdminOverview from "./AdminOverview.jsx";
import PendingVerifications from "./PendingVerifications.jsx";
import AllAccounts from "./AllAccounts.jsx";
import SystemLogs from "./SystemLogs.jsx";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Session-Role": "superAdmin",
      ...(options.headers || {}),
    },
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed.");
    error.code = data.code;
    throw error;
  }
  return data;
}

function AdminDashboard() {
  const { user, authReady, logout } = useAuth();
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const notify = (type, title) => {
    if (!title) return;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: type,
      title,
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: "#062d48",
      color: "#d9ecef",
    });
  };

  const loadAll = async ({ background = false } = {}) => {
    if (!background) {
      setRefreshing(true);
      setError("");
    }
    try {
      const [overviewData, pendingData, accountsData, logsData] = await Promise.all([
        apiRequest("/admin/overview"),
        apiRequest("/admin/owners/pending"),
        apiRequest("/admin/accounts"),
        apiRequest("/admin/logs?limit=100"),
      ]);
      setStats(overviewData);
      setPending(pendingData.pending || []);
      setAccounts(accountsData.accounts || []);
      setLogs(logsData.logs || []);
    } catch (requestError) {
      if (!background) setError(requestError.message);
    } finally {
      if (!background) setRefreshing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) return undefined;
    if (user?.role !== "superAdmin") {
      window.location.replace("/login");
      return;
    }
    const timer = setTimeout(loadAll, 0);
    return () => clearTimeout(timer);
  }, [authReady, user]);

  useEffect(() => {
    if (!authReady || user?.role !== "superAdmin") return undefined;
    const timer = window.setInterval(() => loadAll({ background: true }), 15000);
    return () => window.clearInterval(timer);
  }, [authReady, user?.role]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    notify("success", message);
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) return undefined;
    notify("error", error);
    const timer = setTimeout(() => setError(""), 4500);
    return () => clearTimeout(timer);
  }, [error]);

  const handleApprove = async (ownerId, businessName) => {
    const confirmation = await Swal.fire({
      title: `Approve ${businessName}?`,
      text: "This owner will be able to log in immediately.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve",
      background: "#062d48",
      color: "#d9ecef",
    });
    if (!confirmation.isConfirmed) return;
    try {
      const data = await apiRequest(`/admin/owners/${ownerId}/approve`, { method: "POST" });
      setMessage(data.message);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleReject = async (ownerId, businessName) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: `Reject ${businessName}?`,
      input: "textarea",
      inputLabel: "Reason (shown to the applicant)",
      inputPlaceholder: "e.g. The uploaded permit is expired or unreadable.",
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#d33",
      background: "#062d48",
      color: "#d9ecef",
      inputValidator: (value) => (!value.trim() ? "A reason is required." : undefined),
    });
    if (!isConfirmed) return;
    try {
      const data = await apiRequest(`/admin/owners/${ownerId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setMessage(data.message);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleSetStatus = async (accountId, status, label) => {
    const confirmation = await Swal.fire({
      title: `${status === "Disabled" ? "Disable" : "Enable"} this account?`,
      text: `${label} will ${status === "Disabled" ? "lose" : "regain"} the ability to log in.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: status === "Disabled" ? "Disable" : "Enable",
      background: "#062d48",
      color: "#d9ecef",
    });
    if (!confirmation.isConfirmed) return;
    try {
      const data = await apiRequest(`/admin/accounts/${accountId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(data.message);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const navButtonClass = (page) => {
    const isActive = activePage === page;
    return isActive
      ? "shrink-0 rounded-md border-0 bg-[#65c9c9] bg-clip-padding px-3 py-2 text-left font-['Poppins'] text-[0.78rem] font-medium leading-tight text-[#073047] outline-none transition hover:bg-[#75cccc] cursor-pointer"
      : "shrink-0 rounded-md border-0 bg-transparent bg-clip-padding px-3 py-2 text-left font-['Poppins'] text-[0.78rem] leading-tight text-[#8fb7be] outline-none transition hover:text-[#d9ecef] cursor-pointer";
  };

  if (initialLoading)
    return (
      <main className="grid h-screen place-items-center bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] p-6 text-[#c9e1e5]">
        <div className="text-center">
          <img
            src="/LOGO.svg"
            alt=""
            className="mx-auto h-16 w-auto animate-[pulse_1.3s_ease-in-out_infinite]"
          />
          <p className="mt-4 font-['Poppins'] text-sm">Preparing the admin console…</p>
        </div>
      </main>
    );

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

      <aside className={`owner-sidebar box-border flex w-full shrink-0 flex-col overflow-hidden border-b border-cyan-100/[.08] bg-[#062f43] px-4 py-3 md:h-full md:w-56 md:border-b-0 md:border-r md:px-3 md:pt-4 md:pb-4 ${sidebarOpen ? "is-open" : ""}`}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          aria-label="Refresh admin console"
          title="Refresh"
          className="cursor-pointer flex shrink-0 items-center gap-2.5 rounded-lg border-0 bg-transparent px-1 py-1 text-left transition hover:bg-white/[.04] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
        >
          <img src="/LOGO.svg" alt="Fishonitory" className="h-10 w-10 object-contain" />
          <div>
            <strong className="block font-['Poppins'] text-[0.9rem] font-medium text-[#cde4e6]">
              Fishonitory
            </strong>
            <small className="block font-['Poppins'] text-[0.58rem] text-[#7fa7ae]">
              Super Admin console
            </small>
          </div>
        </button>

        <nav className="mt-4 flex min-w-0 gap-0.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-6 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pr-1">
          <button className={navButtonClass("overview")} type="button" onClick={() => { setActivePage("overview"); setSidebarOpen(false); }}>
            Overview
          </button>
          <button className={navButtonClass("pending")} type="button" onClick={() => { setActivePage("pending"); setSidebarOpen(false); }}>
            Pending Verifications
            {pending.length > 0 && (
              <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#3a2900]">
                {pending.length}
              </span>
            )}
          </button>
          <button className={navButtonClass("accounts")} type="button" onClick={() => { setActivePage("accounts"); setSidebarOpen(false); }}>
            All Accounts
          </button>
          <button className={navButtonClass("logs")} type="button" onClick={() => { setActivePage("logs"); setSidebarOpen(false); }}>
            System Logs
          </button>
        </nav>

        <div className="mt-auto shrink-0 border-t border-cyan-100/[.08] pt-2.5 pb-0.5 md:pt-3 md:pb-1">
          <div className="flex items-center gap-2.5 rounded-lg p-1.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#75bec4]/20 font-['Poppins'] text-sm font-semibold text-[#bce9e9]">
              {(user?.email || "A").trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-['Poppins'] text-[0.78rem] font-medium text-[#cde4e6]">
                Super Admin
              </p>
              <p className="truncate font-['Poppins'] text-[0.62rem] text-[#6f9ca5]">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            className="mt-2.5 w-full rounded-lg border border-cyan-100/10 bg-white/[.05] px-3 py-2 text-center font-['Poppins'] text-[0.75rem] font-medium text-[#b8d8dd] outline-none transition hover:border-red-200/25 hover:bg-red-200/10 hover:text-red-100 cursor-pointer"
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

      <div className="owner-workspace min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5 lg:px-5 lg:py-8">
        <header className="mb-7 flex w-full max-w-7xl flex-wrap items-start justify-between gap-3 border-b border-sky-100/10 pb-5">
          <div>
            <p className="font-['Poppins'] text-[0.65rem] font-medium tracking-[0.16em] text-[#73c4ca]">
              PLATFORM ADMINISTRATION
            </p>
            <p className="mt-1 font-['Poppins'] text-xs text-[#759faa]">
              {currentTime.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100/10 bg-white/[.04] px-3 py-1.5 font-['Poppins'] text-xs text-[#a8c9d0]">
              <span className={`h-1.5 w-1.5 rounded-full bg-[#73c4ca] shadow-[0_0_10px_#73c4ca] ${refreshing ? "animate-pulse" : ""}`} />
              {refreshing ? "Syncing…" : "System online"}
            </span>
          </div>
        </header>

        {activePage === "overview" && <AdminOverview stats={stats} pendingCount={pending.length} />}
        {activePage === "pending" && (
          <PendingVerifications pending={pending} onApprove={handleApprove} onReject={handleReject} />
        )}
        {activePage === "accounts" && <AllAccounts accounts={accounts} onSetStatus={handleSetStatus} />}
        {activePage === "logs" && <SystemLogs logs={logs} />}
      </div>
    </main>
  );
}

export default AdminDashboard;