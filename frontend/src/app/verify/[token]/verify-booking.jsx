"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/shared/adminAuth";
import { formatMoney } from "@/shared/money";
import styles from "./verify.module.css";

export default function VerifyBooking({ token }) {
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entryCount, setEntryCount] = useState(1);

  const loadBooking = useCallback(async () => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      router.replace("/dashboard");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/verify/${token}`, {
        headers: { "x-admin-token": adminToken },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to verify booking.");
      setBooking(payload);
      setEntryCount(1);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [router, token]);

  async function confirmEntry() {
    const adminToken = getAdminToken();
    if (!adminToken) {
      router.replace("/admin/login");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/verify/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ count: entryCount }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to confirm entry.");
      setBooking(payload);
      setEntryCount(1);
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
            <div className={getTicketStatusClass(booking)}>
              <span>{getTicketStatusText(booking)}</span>
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
                <dd>
                  {booking.checkedInCount} of {booking.totalGuests} tickets entered
                  {booking.checkedInAt ? `, completed ${new Date(booking.checkedInAt).toLocaleString("en-IN")}` : ""}
                </dd>
              </div>
            </dl>

            {booking.status !== "confirmed" ? (
              <p className={styles.blockedText}>
                {booking.status === "pending"
                  ? "Payment is not verified yet. Confirm this booking from the dashboard before allowing entry."
                  : "This booking was rejected. Entry is not allowed."}
              </p>
            ) : booking.remainingCount > 0 ? (
              <div className={styles.entryForm}>
                <label htmlFor="entryCount">
                  Tickets entering now
                  <span>{booking.remainingCount} remaining</span>
                </label>
                <select
                  id="entryCount"
                  value={entryCount}
                  onChange={(event) => setEntryCount(Number(event.target.value))}
                >
                  {Array.from({ length: booking.remainingCount }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "ticket" : "tickets"}
                    </option>
                  ))}
                </select>
                <button className={styles.confirmButton} onClick={confirmEntry} disabled={saving}>
                  {saving ? "Confirming..." : `Confirm ${entryCount} ${entryCount === 1 ? "ticket" : "tickets"}`}
                </button>
              </div>
            ) : (
              <button className={styles.confirmButton} disabled>
                Entry Already Complete
              </button>
            )}

            <Link className={styles.scanAgain} href="/admin/scanner">
              Scan Again
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function getTicketStatusClass(booking) {
  if (booking.status === "pending") return styles.pending;
  if (booking.status === "rejected") return styles.rejected;
  return styles.valid;
}

function getTicketStatusText(booking) {
  if (booking.status === "pending") return "Pending payment verification";
  if (booking.status === "rejected") return "Rejected ticket";
  return booking.remainingCount < 1 ? "All Guests Checked In" : "Valid Confirmed Booking";
}
