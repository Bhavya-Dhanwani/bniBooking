"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminBookings, fetchAdminStats, resetBookings, updateBookingStatus } from "@/services/api";
import { clearAdminToken, getAdminToken } from "@/shared/adminAuth";
import { formatMoney } from "@/shared/money";
import styles from "./admin.module.css";

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [modalSrc, setModalSrc] = useState("");

  const loadData = useCallback(async (adminToken) => {
    try {
      const [bookingData, statsData] = await Promise.all([fetchAdminBookings(adminToken), fetchAdminStats(adminToken)]);
      setBookings(bookingData);
      setStats(statsData);
    } catch (error) {
      clearAdminToken();
      router.replace("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    const storedToken = getAdminToken();
    if (!storedToken) {
      router.replace("/admin/login");
      return;
    }
    Promise.resolve().then(() => loadData(storedToken));
  }, [loadData, router]);

  async function changeStatus(id, status) {
    const adminToken = getAdminToken();
    await updateBookingStatus(id, status, adminToken);
    await loadData(adminToken);
  }

  async function clearAllData() {
    if (!confirm("WARNING: This will delete ALL bookings and release ALL seats. Are you sure?")) return;
    const adminToken = getAdminToken();
    await resetBookings(adminToken);
    await loadData(adminToken);
  }

  function logout() {
    clearAdminToken();
    router.replace("/admin/login");
  }

  const filteredBookings = useMemo(() => {
    const filtered = filter === "all" ? bookings : bookings.filter((booking) => booking.status === filter);
    return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [bookings, filter]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/bni-logo.jpg" alt="BNI Kutch" />
          <div>Admin Verification</div>
        </div>
        <div className={styles.headerLinks}>
          <Link href="/">Back to Booking</Link>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.stats}>
          {[
            ["Total Bookings", stats?.totalBookings || 0],
            ["Pending", stats?.pending || 0],
            ["Confirmed", stats?.confirmed || 0],
            ["Rejected", stats?.rejected || 0],
            ["Seats Confirmed", stats?.seatsConfirmed || 0],
            ["Seats Pending", stats?.seatsPending || 0],
          ].map(([label, value]) => (
            <div className={styles.statCard} key={label}>
              <h3>{value}</h3>
              <p>{label}</p>
            </div>
          ))}
        </div>

        <div className={styles.toolbar}>
          {["all", "pending", "confirmed", "rejected"].map((value) => (
            <button
              key={value}
              className={`${styles.filterBtn} ${filter === value ? styles.active : ""}`}
              onClick={() => setFilter(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
          <button className={`${styles.filterBtn} ${styles.resetBtn}`} onClick={clearAllData}>
            Reset All Data
          </button>
        </div>

        <div className={styles.tableWrap}>
          {!filteredBookings.length ? (
            <div className={styles.empty}>
              <h3>No bookings found</h3>
              <p>Bookings made on the main page will appear here.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Seats</th>
                  <th>Amount</th>
                  <th>Screenshot</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.id}</strong>
                      <br />
                      <small>{new Date(booking.date).toLocaleString("en-IN")}</small>
                    </td>
                    <td>
                      <div className={styles.customerName}>{booking.name}</div>
                      <small>
                        {booking.email}
                        <br />
                        {booking.phone}
                      </small>
                    </td>
                    <td>
                      {booking.seats.map((seat) => (
                        <span className={styles.seatTag} key={seat}>
                          {seat}
                        </span>
                      ))}
                    </td>
                    <td>
                      <strong>{formatMoney(booking.total)}</strong>
                      <br />
                      <small>
                        Base {formatMoney(booking.baseAmount)} + GST {formatMoney(booking.gst)}
                      </small>
                    </td>
                    <td>
                      <button className={styles.thumbButton} onClick={() => setModalSrc(booking.screenshot)}>
                        <img className={styles.thumb} src={booking.screenshot} alt="Payment Screenshot" />
                      </button>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge${booking.status}`]}`}>{booking.status}</span>
                    </td>
                    <td>{new Date(booking.date).toLocaleDateString("en-IN")}</td>
                    <td>
                      <ActionButtons booking={booking} onChange={changeStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalSrc && (
        <button className={styles.modal} onClick={() => setModalSrc("")}>
          <img src={modalSrc} alt="Payment Screenshot" />
        </button>
      )}
    </main>
  );
}

function ActionButtons({ booking, onChange }) {
  if (booking.status === "pending") {
    return (
      <>
        <button className={`${styles.btn} ${styles.btnConfirm} ${styles.btnSm}`} onClick={() => onChange(booking.id, "confirmed")}>
          Verify
        </button>{" "}
        <button className={`${styles.btn} ${styles.btnReject} ${styles.btnSm}`} onClick={() => onChange(booking.id, "rejected")}>
          Reject
        </button>
      </>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <button className={`${styles.btn} ${styles.btnReject} ${styles.btnSm}`} onClick={() => onChange(booking.id, "rejected")}>
        Reject & Release
      </button>
    );
  }

  return (
    <button className={`${styles.btn} ${styles.btnConfirm} ${styles.btnSm}`} onClick={() => onChange(booking.id, "confirmed")}>
      Verify
    </button>
  );
}
