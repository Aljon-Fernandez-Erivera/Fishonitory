import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./pages/shared/useAuth.js";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import RegisterBusinessPage from "./pages/RegisterBusinessPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import OwnerDashboard from "./pages/owner/OwnerDashboard.jsx";
import StaffDashboard from "./pages/staff/StaffDashboard.jsx";
import AboutPage from "./pages/shared/AboutPage.jsx";
import HelpPage from "./pages/shared/HelpPage.jsx";
import AccountPage from "./pages/shared/AccountPage.jsx";
import { AuthProvider } from "./pages/shared/AuthContext.jsx";
import "./utils/oceanicSwal.js";

// Protected frontend routes are only allowed for authenticated users with the
// correct role. The browser guard is a UX security layer; the server remains the actual authority.
const protectedRoutes = new Set([
  "/owner-dashboard",
  "/staff-dashboard",
  "/account",
]);

// Public pages should block logged-in users to prevent them from returning to
// landing/login screens while a valid session is still active.
function PublicRoute({ children }) {
  const { user, authReady } = useAuth();

  if (!authReady) return null;
  if (user && !sessionStorage.getItem("fishonitory_login_success")) {
    const destination = user.role === "masterStaff" ? "/staff-dashboard" : "/owner-dashboard";
    return <Navigate to={destination} replace />;
  }

  return children;
}

// The dashboard guard enforces allowed roles on the client side and redirects stale
// or unauthorized sessions back to login before the UI renders protected content.
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, authReady } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady) return undefined;
    if (!user || !allowedRoles.includes(user.role)) {
      sessionStorage.setItem("fishonitory_session_expired", "1");
      sessionStorage.removeItem("role");
      window.history.replaceState(null, "", "/login");
      navigate("/login", { replace: true });
      return undefined;
    }
    if (protectedRoutes.has(location.pathname) && !sessionStorage.getItem("role")) {
      sessionStorage.setItem("fishonitory_session_expired", "1");
      window.history.replaceState(null, "", "/login");
      navigate("/login", { replace: true });
    }
    return undefined;
  }, [allowedRoles, authReady, location.pathname, navigate, user]);

  if (!authReady || !user || !allowedRoles.includes(user.role)) return null;
  return children;
}

// Browser history protection: back/forward navigation must not restore stale
// protected screens or public auth screens for users who are already signed in.
function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const currentPath = location.pathname;
    const role = sessionStorage.getItem("role");
    const isProtected = protectedRoutes.has(currentPath);
    const publicAuthPages = new Set(["/", "/login", "/register", "/forgot-password"]);

    if (isProtected && !role) {
      sessionStorage.setItem("fishonitory_session_expired", "1");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("fishonitory_tab_session");
      window.history.replaceState(null, "", "/login");
      navigate("/login", { replace: true });
      return;
    }

    if (user && publicAuthPages.has(currentPath)) {
      sessionStorage.setItem("fishonitory_session_expired", "1");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("fishonitory_tab_session");
      logout();
      window.history.replaceState(null, "", "/login");
      navigate("/login", { replace: true });
      return;
    }

    const handlePopState = () => {
      const nextPath = window.location.pathname;
      const nextRole = sessionStorage.getItem("role");
      const nextPublicAuthPages = new Set(["/", "/login", "/register", "/forgot-password"]);

      if (protectedRoutes.has(nextPath) && !nextRole) {
        sessionStorage.setItem("fishonitory_session_expired", "1");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("fishonitory_tab_session");
        window.history.replaceState(null, "", "/login");
        navigate("/login", { replace: true });
        return;
      }

      if (user && nextPublicAuthPages.has(nextPath)) {
        sessionStorage.setItem("fishonitory_session_expired", "1");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("fishonitory_tab_session");
        logout();
        window.history.replaceState(null, "", "/login");
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location.pathname, logout, navigate, user]);

  return (
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
      <Route path="/about" element={<AboutPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route
        path="/account"
        element={<ProtectedRoute allowedRoles={["Owner"]}><AccountPage /></ProtectedRoute>}
      />
    </Routes>
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
