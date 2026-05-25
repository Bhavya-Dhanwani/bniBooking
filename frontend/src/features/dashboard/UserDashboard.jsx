"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchCurrentUser, fetchUserBookings, logoutUser, updateUserBookingPhone } from "@/services/api";
import { formatMoney } from "@/shared/money";
import styles from "./dashboard.module.css";

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPhoneId, setEditingPhoneId] = useState("");
  const [phoneDrafts, setPhoneDrafts] = useState({});
  const [phoneSavingId, setPhoneSavingId] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const [{ user: currentUser }, bookingData] = await Promise.all([fetchCurrentUser(), fetchUserBookings()]);
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      setBookings(bookingData);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  async function logout() {
    await logoutUser();
    router.push("/login");
  }

  function startPhoneEdit(booking) {
    setPhoneError("");
    setEditingPhoneId(booking.id);
    setPhoneDrafts((current) => ({ ...current, [booking.id]: booking.phone || "" }));
  }

  async function savePhone(bookingId) {
    const phone = String(phoneDrafts[bookingId] || "").trim();
    const digits = phone.replace(/\D/g, "");

    if (!phone) {
      setPhoneError("Please enter your phone number.");
      return;
    }

    if (digits.length < 10 || digits.length > 15) {
      setPhoneError("Please enter a valid phone number.");
      return;
    }

    setPhoneSavingId(bookingId);
    setPhoneError("");
    try {
      const updatedBooking = await updateUserBookingPhone(bookingId, phone);
      setBookings((current) =>
        current.map((booking) => (booking.id === bookingId ? { ...booking, phone: updatedBooking.phone } : booking)),
      );
      setEditingPhoneId("");
    } catch (error) {
      setPhoneError(error.message);
    } finally {
      setPhoneSavingId("");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <img src="/bni-logo.jpg" alt="BNI Kutch" />
          <span>BNI Kutch Dashboard</span>
        </Link>
        <div className={styles.headerActions}>
          <Link className={styles.homeButton} href="/">
            Home
          </Link>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <section className={styles.container}>
        <div className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Member Dashboard</span>
            <h1>{loading ? "Loading..." : `Hello, ${user?.name}`}</h1>
            <p>Track your bookings, seat details, payment totals, and booking status.</p>
          </div>
        </div>

        <div className={styles.cards}>
          <Stat label="Total Bookings" value={bookings.length} />
          <Stat label="Pending" value={bookings.filter((booking) => booking.status === "pending").length} />
          <Stat label="Confirmed" value={bookings.filter((booking) => booking.status === "confirmed").length} />
          <Stat label="Rejected" value={bookings.filter((booking) => booking.status === "rejected").length} />
        </div>

        <section className={styles.panel}>
          <h2>Your Bookings</h2>
          {!bookings.length ? (
            <div className={styles.empty}>
              <h3>No booking made</h3>
              <p>Your event bookings will appear here after checkout.</p>
              <Link href="/">Book Seats</Link>
            </div>
          ) : (
            <div className={styles.bookingList}>
              {bookings.map((booking) => (
                <article className={styles.bookingCard} key={booking.id}>
                  <div>
                    <strong>{booking.id}</strong>
                    <span className={`${styles.status} ${styles[booking.status]}`}>{booking.status}</span>
                  </div>
                  <p>{new Date(booking.date).toLocaleString("en-IN")}</p>
                  <div className={styles.seats}>
                    {(booking.seats || []).map((seat) => (
                      <span key={seat}>{seat}</span>
                    ))}
                  </div>
                  <dl>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        {editingPhoneId === booking.id ? (
                          <div className={styles.phoneEdit}>
                            <input
                              type="tel"
                              value={phoneDrafts[booking.id] || ""}
                              onChange={(event) =>
                                setPhoneDrafts((current) => ({ ...current, [booking.id]: event.target.value }))
                              }
                              placeholder="Enter phone number"
                              autoComplete="tel"
                              maxLength={20}
                            />
                            <div className={styles.phoneActions}>
                              <button
                                type="button"
                                onClick={() => savePhone(booking.id)}
                                disabled={phoneSavingId === booking.id}
                              >
                                {phoneSavingId === booking.id ? "Saving..." : "Save"}
                              </button>
                              <button type="button" onClick={() => setEditingPhoneId("")}>
                                Cancel
                              </button>
                            </div>
                            {phoneError && <span className={styles.phoneError}>{phoneError}</span>}
                          </div>
                        ) : (
                          <span className={styles.phoneView}>
                            {booking.phone || "Not added"}
                            {booking.status === "confirmed" ? (
                              <small className={styles.phoneLocked}>Locked after confirmation</small>
                            ) : (
                              <button type="button" onClick={() => startPhoneEdit(booking)}>
                                {booking.phone ? "Update" : "Add"}
                              </button>
                            )}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Base</dt>
                      <dd>{formatMoney(booking.baseAmount)}</dd>
                    </div>
                    <div>
                      <dt>GST</dt>
                      <dd>{formatMoney(booking.gst)}</dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>{formatMoney(booking.total)}</dd>
                    </div>
                    <div>
                      <dt>Payment</dt>
                      <dd>{(booking.paymentMethod || "upi").toUpperCase()}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
