"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchAdminStats } from "@/services/api";
import { setAdminToken } from "@/shared/adminAuth";
import styles from "./admin.module.css";

export default function AdminLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await fetchAdminStats(token);
      setAdminToken(token);
      router.push("/admin");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/bni-logo.jpg" alt="BNI Kutch" />
          <div>Admin Verification</div>
        </div>
      </header>
      <form className={styles.loginBox} onSubmit={login}>
        <h1>Admin Login</h1>
        <label>Admin Token</label>
        <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Enter admin token" />
        <button className={`${styles.btn} ${styles.btnConfirm}`} disabled={loading}>
          {loading ? "Checking..." : "Open Admin"}
        </button>
      </form>
    </main>
  );
}
