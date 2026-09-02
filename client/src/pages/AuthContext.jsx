import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const storedToken = localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");

        if (storedToken && storedRole) {
            return { token: storedToken, role: storedRole };
        }
        return null;
    });

    function login(token, role) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        setUser({ token, role });
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
