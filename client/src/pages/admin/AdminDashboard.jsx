import DashboardSidebar from "../../components/DashboardSidebar.jsx";
import DashboardHeader from "../../components/DashboardHeader.jsx";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../shared/useAuth.js";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "../../config.js";
import "../../css/owner-dashboard-layout.css";
import { confirmOceanicAction, oceanicFire, oceanicNotice, showOceanicLogoutConfirm } from "../../utils/oceanicSwal.js";

import AdminOverview from "./AdminOverview.jsx";
import PendingVerifications from "./PendingVerifications.jsx";
import AllAccounts from "./AllAccounts.jsx";
import ActiveBusinesses from "./ActiveBusinesses.jsx";
import AdminAccount from "./AdminAccount.jsx";
import SystemLogs from "./SystemLogs.jsx";
import PlatformNotices from "./PlatformNotices.jsx";
import AboutContactPanel from "../shared/AboutContactPanel.jsx";
import { LoadingOverlay } from "../shared/AuthLayout.jsx";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Session-Role": "superAdmin",
      ...(sessionStorage.getItem("fishonitory_auth_token")
        ? { Authorization: `Bearer ${sessionStorage.getItem("fishonitory_auth_token")}` }
        : {}),
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

// Sidebar section: title, optional description, then indented menu items.
// Contrast on the sidebar background (#021d2e): menu items #d4eaec 13.8:1,
// title #8fc5cb 9.1:1, description #8fb3ba 7.7:1 (all WCAG AAA).
// On mobile the sidebar is a horizontal strip, so the heading is hidden and
// the wrappers use `display: contents` to keep buttons as direct row items.

function AdminDashboard() {
  const { user, authReady, logout, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const adminPages = [
    "overview",
    "pending",
    "businesses",
    "accounts",
    "logs",
    "platform-notices",
    "settings",
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
  const [settingsTab, setSettingsTab] = useState("account");

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
  const [platformNotices, setPlatformNotices] = useState([]);
  const [logPagination, setLogPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [platformNoticesLoading, setPlatformNoticesLoading] = useState(false);
  const [accountPagination, setAccountPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [toastNotice, setToastNotice] = useState(null);

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
  const [profileNameSaving, setProfileNameSaving] = useState(false);

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  const notify = (type, title) => {
    if (!title) return;
    setToastNotice({ type, title });
  };

  useEffect(() => {
    if (!toastNotice) return undefined;
    const timer = window.setTimeout(() => setToastNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastNotice]);

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
        notify("error", error.message);
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

  const loadPlatformNotices = useCallback(async () => {
    setPlatformNoticesLoading(true);
    try {
      const result = await apiRequest("/admin/platform-notices");
      setPlatformNotices(result?.notices || []);
    } catch (requestError) {
      notify("error", requestError.message);
    } finally {
      setPlatformNoticesLoading(false);
    }
  }, []);

  const createPlatformNotice = async (notice) => {
    try {
      const result = await apiRequest("/admin/platform-notices", {
        method: "POST",
        body: JSON.stringify(notice),
      });
      setPlatformNotices((current) => [result.notice, ...current]);
      notify("success", result.message);
      return true;
    } catch (requestError) {
      notify("error", requestError.message);
      return false;
    }
  };

  const deletePlatformNotice = async (notice) => {
    const confirmed = await confirmOceanicAction({
      title: "Remove platform notice?",
      text: `“${notice.title}” will disappear from owner dashboards.`,
      confirmText: "Remove notice",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const result = await apiRequest(`/admin/platform-notices/${notice._id}`, {
        method: "DELETE",
      });
      setPlatformNotices((current) => current.filter((item) => item._id !== notice._id));
      notify("success", result.message);
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  /* =========================================================
     OVERVIEW AUTO REFRESH
     Every 60 seconds
  ========================================================= */

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

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadOverviewData();
      void loadPending();
    });
    return () => { cancelled = true; };
  }, [authReady, user?.role, loadOverviewData, loadPending]);

  /* =========================================================
     PAGE-SPECIFIC DATA LOAD
  ========================================================= */

  useEffect(() => {
    if (!authReady || user?.role !== "superAdmin") {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (activePage === "logs") void loadLogs();
      if (activePage === "platform-notices") void loadPlatformNotices();
      if (activePage === "pending") void loadPending();
    });
    return () => { cancelled = true; };
  }, [authReady, user?.role, activePage, loadLogs, loadPending, loadPlatformNotices]);

  /* =========================================================
     CLOCK
  ========================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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
    if (!authReady || user?.role !== "superAdmin" || activePage !== "settings") {
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
    setProfileNameSaving(true);
    try {
      const data = await apiRequest("/admin/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName, phoneNumber }),
      });
      setAdminProfile(data.profile);
      updateUser(data.profile);
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      });
      setProfileNameSaving(false);
      await oceanicNotice("Profile updated", "Your profile changes have been saved.", "success", { tone: "success" });
    } catch (saveError) {
      setProfileNameSaving(false);
      throw saveError;
    }
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

    notify("success", data.message || "Password updated.");
  };

  /* =========================================================
     APPROVE OWNER
  ========================================================= */

  const handleApprove = async (ownerId, businessName) => {
    const confirmation = await confirmOceanicAction({
      title: `Approve ${businessName}?`,
      text: "This owner will be able to log in immediately and will be notified by email.",
      icon: "question",
      confirmText: "Approve",
    });

    if (!confirmation) {
      return;
    }

    try {
      const data = await apiRequest(`/admin/owners/${ownerId}/approve`, {
        method: "POST",
      });

      notify("success", data.message || `${businessName} was approved.`);

      await Promise.all([
        loadOverviewData({
          background: true,
        }),
        loadPending(),
      ]);
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  /* =========================================================
     REJECT OWNER
  ========================================================= */

  const handleReject = async (ownerId, businessName) => {
    const { value: reason, isConfirmed } = await oceanicFire({
      title: `Reject ${businessName}?`,
      input: "textarea",
      inputLabel: "Reason (shown to the applicant and sent by email)",
      inputPlaceholder: "e.g. The uploaded permit is expired or unreadable.",
      showCancelButton: true,
      confirmButtonText: "Reject",
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

      notify("success", data.message || `${businessName} was rejected.`);

      await Promise.all([
        loadOverviewData({
          background: true,
        }),
        loadPending(),
      ]);
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  /* =========================================================
     ENABLE / DISABLE ACCOUNT
  ========================================================= */

  const handleSetStatus = async (accountId, status, label) => {
    const confirmation = await confirmOceanicAction({
      title: `${status === "Disabled" ? "Disable" : "Enable"} this account?`,
      text: `${label} will ${
        status === "Disabled" ? "lose" : "regain"
      } the ability to log in.`,
      confirmText: status === "Disabled" ? "Disable" : "Enable",
      icon: "warning",
      tone: "default",
    });

    if (!confirmation) {
      return;
    }

    try {
      const data = await apiRequest(`/admin/accounts/${accountId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      });

      notify("success", data.message);

      await Promise.all([
        loadOverviewData({
          background: true,
        }),
        // Keep the current page, search and role filter after the change.
        loadAccounts(accountPagination.page, accountSearch, accountRoleFilter),
      ]);
    } catch (requestError) {
      notify("error", requestError.message);
    }
  };

  /* =========================================================
     SIDEBAR NAVIGATION
  ========================================================= */

  // Underline-style tabs for the Settings page (active = teal line, white text).
  const settingsTabClass = (tab) =>
    `-mb-px border-0 border-b-2 bg-transparent px-4 py-2 font-['Poppins'] text-sm transition cursor-pointer ${
      settingsTab === tab
        ? "border-[#75bec4] font-semibold text-white"
        : "border-transparent text-[#b8d8dd] hover:border-cyan-100/30 hover:text-white"
    }`;

  const saveAboutContact = (content) => apiRequest("/site-content", {
    method: "PATCH",
    body: JSON.stringify(content),
  });

  /* =========================================================
     INITIAL LOADING SCREEN
  ========================================================= */

  if (initialLoading) return <LoadingOverlay label="Preparing the admin console" />;

  /* =========================================================
     MAIN DASHBOARD
  ========================================================= */

  return (
    <main className="owner-dashboard-main box-border flex h-[100dvh] min-h-0 w-full flex-col md:flex-row overflow-hidden bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] text-[#c9e1e5]">
      <DashboardSidebar
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onNavigate={(page) => { setActivePage(page); setSidebarOpen(false); }}
        navigationLabel="Admin dashboard navigation"
        brandSubtitle="Super Admin console"
        refreshLabel="Refresh admin console"
        thinScrollbar={false}
        groups={[
          { items: [{ page: "overview", label: "Overview" }] },
          { title: "Review queue", description: "Check new applications", items: [{ page: "pending", label: "Pending Verifications", badge: pendingPagination.total > 0 && <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#3a2900]">{pendingPagination.total}</span> }] },
          { title: "Business directory", description: "View approved businesses", items: [{ page: "businesses", label: "Active Businesses" }] },
          { title: "Account directory", description: "Manage registered users", items: [{ page: "accounts", label: "All Accounts" }] },
          { title: "System tools", description: "Logs and console settings", items: [{ page: "platform-notices", label: "Platform Notices" }, { page: "logs", label: "System Logs" }, { page: "settings", label: "Settings" }] },
        ]}
        identity={{ avatar: adminProfile?.displayName || user?.email || "A", title: adminProfile?.displayName || "Super Admin", subtitle: user?.email, loading: profileNameSaving }}
        onLogout={async () => {
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

      {/* =====================================================
          WORKSPACE
      ===================================================== */}
      <div className="owner-workspace flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {toastNotice && (
          <div
            className={`app-notification-toast app-notification-toast--${toastNotice.type === "error" ? "error" : "success"}`}
            role="status"
            aria-live="polite"
          >
            <span className="app-notification-toast__icon" aria-hidden="true">
              {toastNotice.type === "error" ? "!" : "\u2713"}
            </span>
            <span>{toastNotice.title}</span>
          </div>
        )}
        <DashboardHeader title="PLATFORM ADMINISTRATION" currentTime={currentTime} syncing={refreshing} />
        <div key={activePage} className="dashboard-page-transition min-h-0 flex-1 overflow-y-auto px-0 py-6 sm:px-5 lg:px-5 lg:py-8">
        {/* Header */}
        

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

        {activePage === "platform-notices" && (
          <PlatformNotices
            notices={platformNotices}
            loading={platformNoticesLoading}
            onCreate={createPlatformNotice}
            onDelete={deletePlatformNotice}
          />
        )}

        {activePage === "settings" && (
          <section className="space-y-5">
            <div className="flex flex-col justify-between gap-3 border-b border-cyan-100/10 pb-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="font-['Fraunces'] text-2xl font-semibold text-[#e1f1f1]">
                  Settings
                </h1>
                <p className="mt-1 font-['Poppins'] text-sm text-[#9bbbc2]">
                  Manage your administrator account and public business
                  information.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-['Poppins'] text-xs font-medium text-emerald-300 sm:self-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                Super Admin Authorized
              </span>
            </div>
            <div
              className="flex flex-wrap gap-2 border-b border-cyan-100/10"
              role="tablist"
              aria-label="Settings sections"
            >
              <button
                type="button"
                role="tab"
                aria-selected={settingsTab === "account"}
                onClick={() => setSettingsTab("account")}
                className={settingsTabClass("account")}
              >
                Account &amp; Security
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={settingsTab === "about-contact"}
                onClick={() => setSettingsTab("about-contact")}
                className={settingsTabClass("about-contact")}
              >
                About &amp; Contact
              </button>
            </div>
            {settingsTab === "account" ? (
              <AdminAccount
                email={user?.email}
                profile={adminProfile}
                mfaEnabled={mfaEnabled}
                onSaveProfile={handleSaveProfile}
                onRequestCode={handleRequestPasswordCode}
                onChangePassword={handleChangePassword}
              />
            ) : (
              <AboutContactPanel editable onSave={saveAboutContact} />
            )}
          </section>
        )}
        </div>
      </div>
    </main>
  );
}

export default AdminDashboard;
