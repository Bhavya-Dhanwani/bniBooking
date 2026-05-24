"use client";

import Link from "next/link";
import { useState } from "react";
import { loginUser, signupUser } from "@/services/api";
import AppPopup from "@/shared/AppPopup";
import styles from "./auth.module.css";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        ...(isSignup ? { name: form.name } : {}),
      };
      const result = isSignup ? await signupUser(payload) : await loginUser(payload);
      setPopup({
        title: isSignup ? "Account created" : "Welcome back",
        message: result.user?.name
          ? `Hi ${result.user.name}, redirecting to home.`
          : "Redirecting to home.",
        type: "success",
      });
      window.setTimeout(() => {
        window.location.assign(getSafeNextPath(new URLSearchParams(window.location.search).get("next")));
      }, 700);
    } catch (error) {
      setPopup({ title: isSignup ? "Signup failed" : "Login failed", message: error.message, type: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        <img src="/bni-logo.jpg" alt="BNI Kutch" />
        <span>
          BNI Kutch
          <small>Laksh Maheshwari Live</small>
        </span>
      </Link>

      <section className={styles.shell}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>Member Access</span>
          <h1>{isSignup ? "Create your booking account" : "Welcome back"}</h1>
          <p>
            {isSignup
              ? "Save your details for faster event bookings, payment tracking, and seat confirmations."
              : "Sign in to continue your BNI Kutch event booking experience."}
          </p>
        </div>

        <form className={styles.card} onSubmit={submit}>
          <div className={styles.formHead}>
            <h2>{isSignup ? "Sign Up" : "Login"}</h2>
            <p>{isSignup ? "Name, email, and password" : "Email and password"}</p>
          </div>

          {isSignup && (
            <label className={styles.field}>
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Enter your full name"
                required
              />
            </label>
          )}

          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Enter password"
              minLength={6}
              required
            />
          </label>

          <button className={styles.submit} disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create Account" : "Login"}
          </button>

          <p className={styles.switchText}>
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Login" : "Create account"}</Link>
          </p>
        </form>
      </section>

      <AppPopup
        open={Boolean(popup)}
        title={popup?.title}
        message={popup?.message}
        type={popup?.type}
        onConfirm={() => setPopup(null)}
      />
    </main>
  );
}

function getSafeNextPath(nextPath) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) return "/";
  return nextPath;
}
