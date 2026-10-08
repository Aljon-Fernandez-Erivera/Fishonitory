import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../shared/useAuth.js";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "../../config.js";
import "../../css/owner-dashboard-layout.css";
import Swal from "sweetalert2";
import { showOceanicLogoutConfirm } from "../../utils/oceanicSwal.js";

import AdminOverview from "./AdminOverview.jsx";
import PendingVerifications from "./PendingVerifications.jsx";
import AllAccounts from "./AllAccounts.jsx";
import ActiveBusinesses from "./ActiveBusinesses.jsx";
import AdminAccount from "./AdminAccount.jsx";
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
    const error = new Error(
      data.message || `Request failed (${response.status}).`,
    );

    error.code = data.code;

    throw error;
  }

  return data;
}

function AdminDashboard() {
  const { user, authReady, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const adminPages = [
    "overview",
    "pending",
    "businesses",
    "accounts",
    "logs",
    "account",
  ];
  const requestedPage = searchParams.get("page");
  const activePage = adminPages.includes(requestedPage) ? requestedPage : "overview";
  const setActivePage = (page) => {
    const nextPage = adminPages.includes(page) ? page : "overview";
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage === "overview") next.delete("page");
      else next.set("page", nextPage);
      return next;
    });
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [pendingPagination, setPendingPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentTime, setCurrentTime] = useState(() => new Date());

  const [registrationAnalytics, setRegistrationAnalytics] = useState([]);

  const [verificationAnalytics, setVerificationAnalytics] = useState(null);

  const [dataHealth, setDataHealth] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  const [accountSearch, setAccountSearch] = useState("");
  const [accountRoleFilter, setAccountRoleFilter] = useState("all");

  const [businesses, setBusinesses] = useState([]);
  const [businessPagination, setBusinessPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

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

  /* =========================================================
     OVERVIEW DATA
     Refreshes:
     - Overview KPIs
     - Registration analytics
     - Verification analytics
     - Data health
     - System health
  ========================================================= */

  const loadOverviewData = useCallback(async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true);
    } else {
      setInitialLoading(true);
    }

    try {
      const [
        overviewRes,
        registrationRes,
        verificationRes,
        dataHealthRes,
        systemHealthRes,
      ] = await Promise.all([
        apiRequest("/admin/overview"),
        apiRequest("/admin/analytics/registrations"),
        apiRequest("/admin/analytics/verification"),
        apiRequest("/admin/data-health"),
        apiRequest("/admin/system-health"),
      ]);

      setStats(overviewRes || null);

      setRegistrationAnalytics(registrationRes?.analytics || []);

      setVerificationAnalytics(verificationRes || null);

      setDataHealth(dataHealthRes || null);

      setSystemHealth(systemHealthRes || null);
    } catch (error) {
      console.error("Failed to load overview data:", error);

      if (!background) {
        setError(error.message);
      }
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setInitialLoading(false);
      }
    }
  }, []);

  /* =========================================================
     PENDING VERIFICATIONS
  ========================================================= */

  const loadPending = useCallback(async (page = 1) => {
    try {
      const res = await apiRequest(
        `/admin/owners/pending?page=${page}&limit=20`,
      );

      setPending(res?.pending || []);

      setPendingPagination(
        res?.pagination || {
          page,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (error) {
      console.error("Failed to load pending verifications:", error);
    }
  }, []);

  /* =========================================================
     ACCOUNTS
     Loaded only when Accounts page is opened.
  ========================================================= */

  const loadAccounts = useCallback(
    async (page = 1, searchValue = "", roleValue = "all") => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });

        if (searchValue.trim()) {
          params.set("search", searchValue.trim());
        }

        if (roleValue !== "all") {
          params.set("role", roleValue);
        }

        const accountsRes = await apiRequest(
          `/admin/accounts?${params.toString()}`,
        );

        setAccounts(accountsRes?.accounts || []);

        setAccountPagination(
          accountsRes?.pagination || {
            page,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        );
      } catch (err) {
        console.error("Failed to load accounts:", err);
      }
    },
    [],
  );

  /* =========================================================
     ACTIVE BUSINESSES
     Loaded only when the Active Businesses page is opened.
  ========================================================= */

  const loadBusinesses = useCallback(async (page = 1, searchValue = "") => {
    setBusinessesLoading(true);
    setBusinessesError("");

    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }

      const res = await apiRequest(`/admin/businesses?${params.toString()}`);

      setBusinesses(res?.businesses || []);

      setBusinessPagination(
        res?.pagination || { page, limit: 20, total: 0, totalPages: 0 },
      );
    } catch (err) {
      console.error("Failed to load businesses:", err);
      setBusinessesError(err.message || "Could not load businesses.");
    } finally {
      setBusinessesLoading(false);
    }
  }, []);

  const loadBusinessStaff = useCallback(async (businessId) => {
    const res = await apiRequest(`/admin/businesses/${businessId}/staff`);
    return res?.staff || [];
  }, []);

  /* =========================================================
     SYSTEM LOGS
     Loaded only when Logs page is opened.
  ========================================================= */

  const loadLogs = useCallback(async (page = 1) => {
    try {
      const logsRes = await apiRequest(`/admin/logs?page=${page}&limit=20`);

      setLogs(logsRes?.logs || []);

      setLogPagination(
        logsRes?.pagination || {
          page,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (err) {
      console.error("Failed to load system logs:", err);
    }
  }, []);

  /* =========================================================
     OVERVIEW AUTO REFRESH
     Every 60 seconds
  ========================================================= */

  const [logPagination, setLogPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [accountPagination, setAccountPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (
      !authReady ||
      user?.role !== "superAdmin" ||
      activePage !== "overview"
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      loadOverviewData({
        background: true,
      });
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, [authReady, user?.role, activePage, loadOverviewData]);

  /* =========================================================
     PENDING AUTO REFRESH
     Every 30 seconds
  ========================================================= */

  useEffect(() => {
    if (!authReady || user?.role !== "superAdmin" || activePage !== "pending") {
      return;
    }

    const timer = window.setInterval(() => {
      loadPending();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [authReady, user?.role, activePage, loadPending]);

  /* =========================================================
     INITIAL DATA LOAD
  ========================================================= */

  useEffect(() => {
    if (!authReady || user?.role !== "superAdmin") {
      return;
    }

    loadOverviewData();
    loadPending();
  }, [authReady, user?.role, loadOverviewData, loadPending]);

  /* =========================================================
     PAGE-SPECIFIC DATA LOAD
  ========================================================= */

  useEffect(() => {
    if (!authReady || user?.role !== "superAdmin") {
      return;
    }

    if (activePage === "logs") {
      loadLogs();
    }

    if (activePage === "pending") {
      loadPending();
    }
  }, [authReady, user?.role, activePage, loadLogs, loadPending]);

  /* =========================================================
     CLOCK
  ========================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =========================================================
     SUCCESS MESSAGE
  ========================================================= */

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    notify("success", message);

    const timer = setTimeout(() => {
      setMessage("");
    }, 4500);

    return () => clearTimeout(timer);
  }, [message]);

  /* =========================================================
     ERROR MESSAGE
  ========================================================= */

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    notify("error", error);

    const timer = setTimeout(() => {
      setError("");
    }, 4500);

    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (
      !authReady ||
      user?.role !== "superAdmin" ||
      activePage !== "accounts"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      loadAccounts(1, accountSearch, accountRoleFilter);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    authReady,
    user?.role,
    activePage,
    accountSearch,
    accountRoleFilter,
    loadAccounts,
  ]);

  useEffect(() => {
    if (
      !authReady ||
      user?.role !== "superAdmin" ||
      activePage !== "businesses"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      loadBusinesses(1, businessSearch);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [authReady, user?.role, activePage, businessSearch, loadBusinesses]);

  /* =========================================================
     ACCOUNT & SECURITY
  ========================================================= */

  useEffect(() => {
    if (!authReady || user?.role !== "superAdmin" || activePage !== "account") {
      return;
    }

    let active = true;

    apiRequest("/admin/profile")
      .then((res) => {
        if (active) setAdminProfile(res?.profile || null);
      })
      .catch((err) => console.error("Failed to load admin profile:", err));

    apiRequest("/auth/totp/status")
      .then((res) => {
        if (active) setMfaEnabled(Boolean(res?.enabled));
      })
      .catch(() => {
        if (active) setMfaEnabled(null);
      });

    return () => {
      active = false;
    };
  }, [authReady, user?.role, activePage]);

  // Throws on failure so the dialog can show the message under the fields.
  const handleSaveProfile = async ({ displayName, phoneNumber }) => {
    const data = await apiRequest("/admin/profile", {
      method: "PATCH",
      body: JSON.stringify({ displayName, phoneNumber }),
    });

    setAdminProfile(data.profile);
    setMessage(data.message);
  };

  const handleRequestPasswordCode = (currentPassword) =>
    apiRequest("/auth/password/change/code", {
      method: "POST",
      body: JSON.stringify({ currentPassword }),
    });

  const handleChangePassword = async (currentPassword, newPassword, code) => {
    const data = await apiRequest("/auth/password/change", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword, code }),
    });

    setMessage(data.message);
  };

  /* =========================================================
     APPROVE OWNER
  ========================================================= */

  const handleApprove = async (ownerId, businessName) => {
    const confirmation = await Swal.fire({
      title: `Approve ${businessName}?`,
      text: "This owner will be able to log in immediately and will be notified by email.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve",
      background: "#062d48",
      color: "#d9ecef",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      const data = await apiRequest(`/admin/owners/${ownerId}/approve`, {
        method: "POST",
      });

      setMessage(data.message);

      await Promise.all([
        loadOverviewData({
          background: true,
        }),
        loadPending(),
      ]);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  /* =========================================================
     REJECT OWNER
  ========================================================= */

  const handleReject = async (ownerId, businessName) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: `Reject ${businessName}?`,
      input: "textarea",
      inputLabel: "Reason (shown to the applicant and sent by email)",
      inputPlaceholder: "e.g. The uploaded permit is expired or unreadable.",
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#d33",
      background: "#062d48",
      color: "#d9ecef",
      backdropClass: "oceanic-modal-backdrop",
      customClass: {
        confirmButton: "oceanic-swal-confirm oceanic-swal-danger",
        cancelButton: "oceanic-swal-cancel",
        popup: "oceanic-swal-popup",
        title: "oceanic-swal-title",
        htmlContainer: "oceanic-swal-text",
        actions: "oceanic-swal-actions",
      },
      buttonsStyling: false,
      inputValidator: (value) =>
        !value.trim() ? "A reason is required." : undefined,
    });

    if (!isConfirmed) {
      return;
    }

    try {
      const data = await apiRequest(`/admin/owners/${ownerId}/reject`, {
        method: "POST",
        body: JSON.stringify({
          reason,
        }),
      });

      setMessage(data.message);

      await Promise.all([
        loadOverviewData({
          background: true,
        }),
        loadPending(),
      ]);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  /* =========================================================
     ENABLE / DISABLE ACCOUNT
  ========================================================= */

  const handleSetStatus = async (accountId, status, label) => {
    const confirmation = await Swal.fire({
      title: `${status === "Disabled" ? "Disable" : "Enable"} this account?`,
      text: `${label} will ${
        status === "Disabled" ? "lose" : "regain"
      } the ability to log in.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: status === "Disabled" ? "Disable" : "Enable",
      background: "#062d48",
      color: "#d9ecef",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      const data = await apiRequest(`/admin/accounts/${accountId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      });

      setMessage(data.message);

      await Promise.all([
        loadOverviewData({
          background: true,
        }),
        // Keep the current page, search and role filter after the change.
        loadAccounts(accountPagination.page, accountSearch, accountRoleFilter),
      ]);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  /* =========================================================
     SIDEBAR NAVIGATION
  ========================================================= */

  const navButtonClass = (page) => {
    return `dashboard-nav-link ${activePage === page ? "is-active" : ""}`;
  };

  /* =========================================================
     INITIAL LOADING SCREEN
  ========================================================= */

  if (initialLoading) {
    return (
      <main className="grid h-screen place-items-center bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] p-6 text-[#c9e1e5]">
        <div className="text-center">
          <img
            src="/LOGO.svg"
            alt=""
            className="mx-auto h-16 w-auto animate-[pulse_1.3s_ease-in-out_infinite]"
          />

          <p className="mt-4 font-['Poppins'] text-sm">
            Preparing the admin console…
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     MAIN DASHBOARD
  ========================================================= */

  return (
    <main className="owner-dashboard-main box-border flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] text-[#c9e1e5] md:flex-row">
      {/* Mobile menu button */}
      <button
        type="button"
        aria-label={
          sidebarOpen ? "Close dashboard menu" : "Open dashboard menu"
        }
        aria-expanded={sidebarOpen}
        className={`owner-mobile-menu-toggle ${sidebarOpen ? "is-open" : ""}`}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile backdrop */}
      <div
        className={`owner-mobile-backdrop ${sidebarOpen ? "is-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`owner-sidebar box-border flex w-full shrink-0 flex-col overflow-hidden border-b border-cyan-100/[.08] bg-[#021d2e] px-4 py-3 md:h-full md:w-56 md:border-b-0 md:border-r md:px-3 md:pt-4 md:pb-4 ${
          sidebarOpen ? "is-open" : ""
        }`}
      >
        {/* Logo */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          aria-label="Refresh admin console"
          title="Refresh"
          className="cursor-pointer flex shrink-0 items-center gap-2.5 rounded-lg border-0 bg-transparent px-1 py-1 text-left transition hover:bg-white/[.04] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
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
              Super Admin console
            </small>
          </div>
        </button>

        {/* Navigation */}
        <nav className="mt-4 flex min-w-0 gap-0.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-6 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pr-1">
          {/* Overview */}
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

          {/* Pending */}
          <button
            className={navButtonClass("pending")}
            type="button"
            onClick={() => {
              setActivePage("pending");
              setSidebarOpen(false);
            }}
          >
            Pending Verifications
            {pendingPagination.total > 0 && (
              <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#3a2900]">
                {pendingPagination.total}
              </span>
            )}
          </button>

          {/* Active businesses */}
          <button
            className={navButtonClass("businesses")}
            type="button"
            onClick={() => {
              setActivePage("businesses");
              setSidebarOpen(false);
            }}
          >
            Active Businesses
          </button>

          {/* Accounts */}
          <button
            className={navButtonClass("accounts")}
            type="button"
            onClick={() => {
              setActivePage("accounts");
              setSidebarOpen(false);
            }}
          >
            All Accounts
          </button>

          {/* Logs */}
          <button
            className={navButtonClass("logs")}
            type="button"
            onClick={() => {
              setActivePage("logs");
              setSidebarOpen(false);
            }}
          >
            System Logs
          </button>

          {/* Account & security */}
          <button
            className={navButtonClass("account")}
            type="button"
            onClick={() => {
              setActivePage("account");
              setSidebarOpen(false);
            }}
          >
            Account &amp; Security
          </button>
        </nav>

        {/* User / Logout */}
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

      {/* =====================================================
          WORKSPACE
      ===================================================== */}

      <div className="owner-workspace min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5 lg:px-5 lg:py-8">
        {/* Header */}
        <header className="mb-7 flex w-full max-w-7xl flex-wrap items-start justify-between gap-3 border-b border-sky-100/10 pb-5">
          <div>
            <p className="font-['Poppins'] text-[0.65rem] font-medium tracking-[0.16em] text-[#73c4ca]">
              PLATFORM ADMINISTRATION
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

          <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100/10 bg-white/[.04] px-3 py-1.5 font-['Poppins'] text-xs text-[#a8c9d0]">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-[#73c4ca] shadow-[0_0_10px_#73c4ca] ${
                  refreshing ? "animate-pulse" : ""
                }`}
              />

              {refreshing ? "Syncing…" : "System online"}
            </span>
          </div>
        </header>

        {/* ===================================================
            OVERVIEW
        =================================================== */}

        {activePage === "overview" && (
          <AdminOverview
            stats={stats}
            pendingCount={pendingPagination.total}
            pendingList={pending}
            onNavigate={setActivePage}
            registrationAnalytics={registrationAnalytics}
            verificationAnalytics={verificationAnalytics}
            dataHealth={dataHealth}
            systemHealth={systemHealth}
          />
        )}

        {/* ===================================================
            PENDING
        =================================================== */}

        {activePage === "pending" && (
          <PendingVerifications
            pending={pending}
            pagination={pendingPagination}
            onPageChange={loadPending}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* ===================================================
            ACTIVE BUSINESSES
        =================================================== */}

        {activePage === "businesses" && (
          <ActiveBusinesses
            businesses={businesses}
            loading={businessesLoading}
            error={businessesError}
            pagination={businessPagination}
            onPageChange={(page) => loadBusinesses(page, businessSearch)}
            search={businessSearch}
            onSearchChange={setBusinessSearch}
            onLoadStaff={loadBusinessStaff}
          />
        )}

        {/* ===================================================
            ACCOUNTS
        =================================================== */}

        {activePage === "accounts" && (
          <AllAccounts
            accounts={accounts}
            pagination={accountPagination}
            onPageChange={(page) =>
              loadAccounts(page, accountSearch, accountRoleFilter)
            }
            onSetStatus={handleSetStatus}
            search={accountSearch}
            onSearchChange={setAccountSearch}
            roleFilter={accountRoleFilter}
            onRoleChange={setAccountRoleFilter}
            onLoadStaff={loadBusinessStaff}
          />
        )}

        {/* ===================================================
            SYSTEM LOGS
        =================================================== */}

        {activePage === "logs" && (
          <SystemLogs
            logs={logs}
            pagination={logPagination}
            onPageChange={loadLogs}
          />
        )}

        {/* ===================================================
            ACCOUNT & SECURITY
        =================================================== */}

        {activePage === "account" && (
          <AdminAccount
            email={user?.email}
            profile={adminProfile}
            mfaEnabled={mfaEnabled}
            onSaveProfile={handleSaveProfile}
            onRequestCode={handleRequestPasswordCode}
            onChangePassword={handleChangePassword}
          />
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;