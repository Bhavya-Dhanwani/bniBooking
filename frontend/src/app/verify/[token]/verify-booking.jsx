"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/shared/money";
import styles from "./verify.module.css";

export default function VerifyBooking({ token }) {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBooking = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/verify/${token}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to verify booking.");
      setBooking(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  async function confirmEntry() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/verify/${token}`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to confirm entry.");
      setBooking(payload);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    queueMicrotask(loadBooking);
  }, [loadBooking]);

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <img src="/bni-logo.jpg" alt="BNI Kutch" className={styles.logo} />
        <h1>Booking Verification</h1>

        {loading ? <p className={styles.note}>Checking booking...</p> : null}

        {error ? (
          <div className={styles.invalid}>
            <h2>Not Valid</h2>
            <p>{error}</p>
          </div>
        ) : null}

        {booking ? (
          <div className={styles.details}>
            <div className={styles.valid}>
              <span>{booking.checkedInAt ? "Entry Confirmed" : "Valid Confirmed Booking"}</span>
            </div>

            <dl>
              <div>
                <dt>Booking ID</dt>
                <dd>{booking.id}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{booking.name}</dd>
              </div>
              <div>
                <dt>Seats</dt>
                <dd>{booking.seats.join(", ")}</dd>
              </div>
              <div>
                <dt>Total Paid</dt>
                <dd>{formatMoney(booking.total)}</dd>
              </div>
              <div>
                <dt>Booked On</dt>
                <dd>{new Date(booking.date).toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt>Entry Status</dt>
                <dd>{booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleString("en-IN") : "Not entered yet"}</dd>
              </div>
            </dl>

            <button className={styles.confirmButton} onClick={confirmEntry} disabled={saving || booking.checkedInAt}>
              {booking.checkedInAt ? "Entry Already Confirmed" : saving ? "Confirming..." : "Confirm Entry"}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
