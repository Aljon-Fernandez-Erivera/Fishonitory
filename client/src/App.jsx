import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./pages/shared/useAuth.js";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import RegisterBusinessPage from "./pages/RegisterBusinessPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import OwnerDashboard from "./pages/owner/OwnerDashboard.jsx";
import StaffDashboard from "./pages/staff/StaffDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AboutPage from "./pages/shared/AboutPage.jsx";
import HelpPage from "./pages/shared/HelpPage.jsx";
import LandingHelpPage from "./pages/shared/LandingHelpPage.jsx";
import AccountPage from "./pages/shared/AccountPage.jsx";
import { AuthProvider } from "./pages/shared/AuthContext.jsx";
import { LoadingOverlay } from "./pages/shared/AuthLayout.jsx";
import {
  ACTION_END_EVENT,
  ACTION_START_EVENT,
} from "./utils/trackActionRequests.js";
import "./utils/oceanicSwal.js";

// Public pages should block logged-in users to prevent them from returning to
// landing/login screens while a valid session is still active.
function PublicRoute({ children }) {
  const { user, authReady } = useAuth();

  if (!authReady) return <LoadingOverlay label="Restoring your session" />;
  if (user) {
    const destination =
      user.role === "masterStaff"
        ? "/staff-dashboard"
        : user.role === "superAdmin"
          ? "/admin-dashboard"
          : "/owner-dashboard";
    return <Navigate to={destination} replace />;
  }

  return children;
}

function HomeRoute() {
  const { user, authReady } = useAuth();

  if (!authReady) return <LoadingOverlay label="Restoring your session" />;
  if (user) {
    const destination =
      user.role === "masterStaff"
        ? "/staff-dashboard"
        : user.role === "superAdmin"
          ? "/admin-dashboard"
          : "/owner-dashboard";
    return <Navigate to={destination} replace />;
  }
  return <LandingPage />;
}

// The dashboard guard enforces allowed roles on the client side and redirects stale
// or unauthorized sessions back to login before the UI renders protected content.
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, authReady } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authReady || (user && allowedRoles.includes(user.role)))
      return undefined;
    {
      sessionStorage.setItem("fishonitory_session_expired", "1");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("fishonitory_tab_session");
    }
    return undefined;
  }, [allowedRoles, authReady, user]);

  // Show a real page while session restoration finishes, then replace stale
  // dashboard history entries with the public landing page.
  if (!authReady) return <LoadingOverlay label="Restoring your session" />;
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function GlobalActionLoader() {
  const [visible, setVisible] = useState(false);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    let activeRequests = 0;
    let showTimer;
    const onStart = () => {
      activeRequests += 1;
      if (activeRequests === 1) {
        showTimer = window.setTimeout(() => setVisible(true), 250);
      }
    };
    const onEnd = () => {
      activeRequests = Math.max(0, activeRequests - 1);
      if (activeRequests === 0) {
        window.clearTimeout(showTimer);
        setVisible(false);
      }
    };
    window.addEventListener(ACTION_START_EVENT, onStart);
    window.addEventListener(ACTION_END_EVENT, onEnd);
    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener(ACTION_START_EVENT, onStart);
      window.removeEventListener(ACTION_END_EVENT, onEnd);
    };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setInterval(
      () => setDots((value) => (value % 3) + 1),
      450,
    );
    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] grid place-items-center bg-[#021a31]/75 p-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading. Please wait."
    >
      <div className="text-center">
        <img
          src="/LOGO.svg"
          alt="Fishonitory"
          className="mx-auto h-28 w-28 animate-[pulse_1.3s_ease-in-out_infinite] object-contain drop-shadow-[0_0_24px_rgba(115,196,202,.4)]"
        />
        <p className="mt-4 min-w-32 font-['Poppins'] text-base font-medium text-[#d2e8ea]">
          Loading{".".repeat(dots)}
        </p>
      </div>
    </div>
  );
}

// Browser history protection: back/forward navigation must not restore stale
// protected screens or public auth screens for users who are already signed in.
function AppRoutes() {
  const { user, logout } = useAuth();
  const [idlePromptUser, setIdlePromptUser] = useState(null);
  const currentUserId = user?.id || user?._id || user?.email || null;
  const idleStorageKey = currentUserId
    ? `fishonitory_idle_timer_${encodeURIComponent(currentUserId)}`
    : null;
  const idlePrompt = Boolean(currentUserId && idlePromptUser === currentUserId);
  const [idleDeadline, setIdleDeadline] = useState(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const lastActivityRef = useRef(Date.now());
  const idleDeadlineRef = useRef(null);

  useEffect(() => {
    if (!user || !currentUserId) return undefined;
    const idleLimitMs = 5 * 60 * 1000;
    const promptDurationMs = 2 * 60 * 1000;
    const now = Date.now();
    let savedTimer = null;
    try {
      savedTimer = JSON.parse(sessionStorage.getItem(idleStorageKey) || "null");
    } catch {
      sessionStorage.removeItem(idleStorageKey);
    }
    lastActivityRef.current = Number.isFinite(savedTimer?.lastActivityAt)
      ? savedTimer.lastActivityAt
      : now;
    idleDeadlineRef.current = Number.isFinite(savedTimer?.promptDeadlineAt)
      ? savedTimer.promptDeadlineAt
      : null;
    setIdlePromptUser(idleDeadlineRef.current !== null ? currentUserId : null);
    setIdleDeadline(idleDeadlineRef.current);
    if (!Number.isFinite(savedTimer?.lastActivityAt)) {
      sessionStorage.setItem(
        idleStorageKey,
        JSON.stringify({ lastActivityAt: now }),
      );
    }

    const checkElapsedTime = () => {
      const now = Date.now();
      setClockNow(now);
      if (idleDeadlineRef.current === -1) return;
      if (idleDeadlineRef.current !== null) {
        if (now >= idleDeadlineRef.current) {
          idleDeadlineRef.current = -1;
          void logout();
        }
        return;
      }
      const promptAt = lastActivityRef.current + idleLimitMs;
      if (now >= promptAt) {
        idleDeadlineRef.current = promptAt + promptDurationMs;
        sessionStorage.setItem(
          idleStorageKey,
          JSON.stringify({
            lastActivityAt: lastActivityRef.current,
            promptDeadlineAt: idleDeadlineRef.current,
          }),
        );
        setIdleDeadline(idleDeadlineRef.current);
        setIdlePromptUser(currentUserId);
        setClockNow(now);
      }
    };
    const resetIdle = () => {
      if (idleDeadlineRef.current !== null) return;
      lastActivityRef.current = Date.now();
      sessionStorage.setItem(
        idleStorageKey,
        JSON.stringify({ lastActivityAt: lastActivityRef.current }),
      );
      checkElapsedTime();
    };
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((event) =>
      window.addEventListener(event, resetIdle, { passive: true }),
    );
    const interval = window.setInterval(checkElapsedTime, 1000);
    document.addEventListener("visibilitychange", checkElapsedTime);
    window.addEventListener("focus", checkElapsedTime);
    checkElapsedTime();
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetIdle));
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkElapsedTime);
      window.removeEventListener("focus", checkElapsedTime);
    };
  }, [user, currentUserId, idleStorageKey, logout]);

  const continueSession = () => {
    lastActivityRef.current = Date.now();
    idleDeadlineRef.current = null;
    if (idleStorageKey) {
      sessionStorage.setItem(
        idleStorageKey,
        JSON.stringify({ lastActivityAt: lastActivityRef.current }),
      );
    }
    setIdlePromptUser(null);
    setIdleDeadline(null);
    setClockNow(Date.now());
  };
  const secondsLeft =
    idleDeadline === null
      ? 120
      : Math.max(0, Math.ceil((idleDeadline - clockNow) / 1000));

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterBusinessPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/owner-dashboard"
          element={
            <ProtectedRoute allowedRoles={["Owner"]}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute allowedRoles={["masterStaff"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["superAdmin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/landing-help" element={<LandingHelpPage />} />
        <Route
          path="/help"
          element={
            <ProtectedRoute allowedRoles={["Owner", "masterStaff"]}>
              <HelpPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute allowedRoles={["Owner"]}>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      {idlePrompt && user && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="idle-title"
            className="w-full max-w-md rounded-2xl border border-sky-100/20 bg-[#062d48] p-7 text-center text-[#d9ecef] shadow-2xl"
          >
            <h2 id="idle-title" className="font-['Fraunces'] text-2xl">
              Are you still there?
            </h2>
            <p className="mt-3 font-['Poppins'] text-sm text-[#a9c8cf]">
              You have been inactive for a while. You will be automatically
              logged out in
            </p>
            <p className="my-4 font-['Poppins'] text-3xl font-semibold tabular-nums">
              {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45]"
                onClick={continueSession}
              >
                Keep login
              </button>
              <button
                type="button"
                className="rounded-full border bg-transparent border-white/20 px-4 py-2.5 font-['Poppins'] text-sm"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </section>
        </div>
      )}
      <GlobalActionLoader />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
