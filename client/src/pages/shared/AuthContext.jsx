import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../config.js";
import { AuthContext } from "./authContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [setToastMessage] = useState("");

  const refreshSession = useCallback(async () => {
    const tabSessionKey = "fishonitory_tab_session";
    const hasTabSession = sessionStorage.getItem(tabSessionKey) === "active";
    const token = sessionStorage.getItem("fishonitory_auth_token");

    if (!hasTabSession && !token) {
      sessionStorage.removeItem("role");
      setUser(null);
      return;
    }

    const pathname = window.location.pathname;
    const storedRole = sessionStorage.getItem("role");
    const sessionRole =
      storedRole ||
      (pathname === "/owner-dashboard" || pathname === "/account"
        ? "Owner"
        : pathname === "/staff-dashboard"
          ? "masterStaff"
          : "");

    try {
      const response = await fetch(`${API_URL}/auth/session`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(sessionRole ? { "X-Session-Role": sessionRole } : {}),
        },
      });
      const sessionUser = response.ok ? (await response.json()).user : null;

      if (sessionUser) {
        sessionStorage.setItem("role", sessionUser.role);
        setUser(sessionUser);
      } else {
        sessionStorage.removeItem("role");
        setUser(null);
      }
    } catch {
      sessionStorage.removeItem("role");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    if (!sessionStorage.getItem("fishonitory_tab_session")) {
      sessionStorage.setItem("fishonitory_tab_session", "fresh");
    }

    refreshSession().finally(() => {
      if (active) setAuthReady(true);
    });

    const handlePageShow = (event) => {
      if (event.persisted) {
        refreshSession();
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      active = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [refreshSession]);

  const login = useCallback(async (token, role) => {
    sessionStorage.setItem("fishonitory_tab_session", "active");
    sessionStorage.setItem("role", role);
    if (token) {
      sessionStorage.setItem("fishonitory_auth_token", token);
    }
    sessionStorage.removeItem("fishonitory_session_expired");
    try {
      const response = await fetch(`${API_URL}/auth/session`, {
        credentials: "include",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          "X-Session-Role": role,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          return;
        }
      }
    } catch (error) {
      console.error("Session check failed:", error);
      setToastMessage(
        "Internet Connection Error. Proceeding in offline mode...",
      );
    }
    setUser({ role });
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: user?.role ? { "X-Session-Role": user.role } : {},
      });
    } finally {
      sessionStorage.setItem("fishonitory_session_expired", "1");
      sessionStorage.removeItem("fishonitory_tab_session");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("fishonitory_auth_token");
      setUser(null);
    }
  }, [user?.role]);

  return (
    <AuthContext.Provider value={{ user, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}