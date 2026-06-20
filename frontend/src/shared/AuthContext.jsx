"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchCurrentUser } from "@/services/api";

const AuthContext = createContext({ user: null, loading: true, setUser: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(90deg, rgba(16,32,51,0.9), rgba(107,15,26,0.78) 52%, rgba(107,15,26,0.5))",
          zIndex: 9999,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid rgba(230,199,122,0.3)",
              borderTopColor: "#e6c77a",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#fff8e7", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.1rem", letterSpacing: 1 }}>
            Loading...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}
