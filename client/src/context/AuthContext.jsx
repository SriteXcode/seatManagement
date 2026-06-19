import React, { createContext, useContext, useState, useEffect } from "react";
import { isTokenExpired, decodeToken } from "../utils/helpers";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem("token");
    if (isTokenExpired(t)) {
      localStorage.removeItem("token");
      return "";
    }
    return t;
  });

  const decoded = decodeToken(token);
  const userRole = decoded?.role || "admin";
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken("");
    };
    window.addEventListener("unauthorized-access", handleUnauthorized);
    return () => {
      window.removeEventListener("unauthorized-access", handleUnauthorized);
    };
  }, []);

  const login = (t) => {
    if (isTokenExpired(t)) {
      setToken("");
    } else {
      setToken(t);
    }
  };

  const logout = () => setToken("");

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        userRole,
        decoded,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
