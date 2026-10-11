import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
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
import AccountPage from "./pages/shared/AccountPage.jsx";
import { AuthProvider } from "./pages/shared/AuthContext.jsx";
import "./utils/oceanicSwal.js";

// Public pages should block logged-in users to prevent them from returning to
// landing/login screens while a valid session is still active.
function PublicRoute({ children }) {
  const { user, authReady } = useAuth();

  if (!authReady) return null;
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

// The dashboard guard enforces allowed roles on the client side and redirects stale
// or unauthorized sessions back to login before the UI renders protected content.
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, authReady } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authReady || (user && allowedRoles.includes(user.role))) return undefined;
    {
      sessionStorage.setItem("fishonitory_session_expired", "1");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("fishonitory_tab_session");
    }
    return undefined;
  }, [allowedRoles, authReady, user]);

  // Show a real page while session restoration finishes, then replace stale
  // dashboard history entries with the public landing page.
  if (!authReady) return <LandingPage />;
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}

// Browser history protection: back/forward navigation must not restore stale
// protected screens or public auth screens for users who are already signed in.
function AppRoutes() {
  const { user, logout } = useAuth();
  const [idlePrompt, setIdlePrompt] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  useEffect(() => {
    if (!user) { setIdlePrompt(false); return undefined; }
    let idleTimer;
    let countdownTimer;
    let lastActivity = Date.now();
    const resetIdle = () => {
      if (idlePrompt) return;
      lastActivity = Date.now();
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { setSecondsLeft(120); setIdlePrompt(true); }, 5 * 60 * 1000);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetIdle, { passive: true }));
    idleTimer = window.setTimeout(() => { setSecondsLeft(120); setIdlePrompt(true); }, Math.max(0, 5 * 60 * 1000 - (Date.now() - lastActivity)));
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetIdle));
      window.clearTimeout(idleTimer);
      window.clearInterval(countdownTimer);
    };
  }, [user, idlePrompt]);

  useEffect(() => {
    if (!idlePrompt || !user) return undefined;
    const interval = window.setInterval(() => setSecondsLeft((seconds) => {
      if (seconds <= 1) { window.clearInterval(interval); logout(); return 0; }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [idlePrompt, logout, user]);

  const continueSession = () => { setIdlePrompt(false); setSecondsLeft(120); };

  return (
    <>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterBusinessPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route
        path="/owner-dashboard"
        element={<ProtectedRoute allowedRoles={["Owner"]}><OwnerDashboard /></ProtectedRoute>}
      />
      <Route
        path="/staff-dashboard"
        element={<ProtectedRoute allowedRoles={["masterStaff"]}><StaffDashboard /></ProtectedRoute>}
      />
      <Route
        path="/admin-dashboard"
        element={<ProtectedRoute allowedRoles={["superAdmin"]}><AdminDashboard /></ProtectedRoute>}
      />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route
        path="/account"
        element={<ProtectedRoute allowedRoles={["Owner"]}><AccountPage /></ProtectedRoute>}
      />
      <Route path="*" element={<LandingPage />} />
    </Routes>
    {idlePrompt && user && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="idle-title" className="w-full max-w-md rounded-2xl border border-sky-100/20 bg-[#062d48] p-7 text-center text-[#d9ecef] shadow-2xl"><h2 id="idle-title" className="font-['Fraunces'] text-2xl">Are you still there?</h2><p className="mt-3 font-['Poppins'] text-sm text-[#a9c8cf]">You have been inactive for a while. You will be automatically logged out in</p><p className="my-4 font-['Poppins'] text-3xl font-semibold tabular-nums">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p><div className="grid grid-cols-2 gap-3"><button type="button" className="rounded-full bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45]" onClick={continueSession}>Keep login</button><button type="button" className="rounded-full border border-white/20 px-4 py-2.5 font-['Poppins'] text-sm" onClick={logout}>Logout</button></div></section></div>}
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
