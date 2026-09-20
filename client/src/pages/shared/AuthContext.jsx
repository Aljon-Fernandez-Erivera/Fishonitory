import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../config.js";
import { AuthContext } from "./authContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    const pathname = window.location.pathname;
    const sessionRole = pathname === "/owner-dashboard" || pathname === "/account"
      ? "Owner"
      : pathname === "/staff-dashboard"
        ? "masterStaff"
        : "";

    fetch(`${API_URL}/auth/session`, {
      credentials: "include",
      headers: sessionRole ? { "X-Session-Role": sessionRole } : {},
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.user;
      })
      .then((sessionUser) => {
        if (!active) return;

        if (sessionUser) {
          sessionStorage.setItem("role", sessionUser.role);
          setUser(sessionUser);
        } else {
          sessionStorage.removeItem("role");
          setUser(null);
        }
      })
      .catch(() => {
        if (active) {
          sessionStorage.removeItem("role");
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback((_token, role) => {
    sessionStorage.setItem("role", role);
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
      sessionStorage.removeItem("role");
      setUser(null);
    }
  }, [user?.role]);

  return (
    <AuthContext.Provider value={{ user, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
