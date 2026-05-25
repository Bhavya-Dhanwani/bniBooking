"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createNormalAdmin,
  fetchAdminBookings,
  fetchAdminStats,
  fetchDiscountSetting,
  fetchSiteSetting,
  resetBookings,
  updateBookingStatus,
  updateDiscountSetting,
  updateSiteSetting,
} from "@/services/api";
import { clearAdminToken, getAdminToken } from "@/shared/adminAuth";
import { formatMoney } from "@/shared/money";
import AppPopup from "@/shared/AppPopup";
import styles from "./admin.module.css";

const EXPORT_HEADERS = [
  "Booking ID",
  "Customer Name",
  "Email",
  "Phone",
  "GST No.",
  "Seats",
  "Base Amount",
  "GST",
  "Total",
  "Payment Method",
  "Status",
  "Date",
  "Price Breakup",
];

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalSrc, setModalSrc] = useState("");
  const [resetPopupOpen, setResetPopupOpen] = useState(false);
  const [settingsPopup, setSettingsPopup] = useState(null);
  const [discountEnabled, setDiscountEnabled] = useState(true);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [siteDown, setSiteDown] = useState(false);
  const [savingSiteStatus, setSavingSiteStatus] = useState(false);
  const [access, setAccess] = useState(null);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminResult, setNewAdminResult] = useState(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const loadData = useCallback(async (adminToken) => {
    try {
      const [bookingData, statsData, discountSetting, siteSetting] = await Promise.all([
        fetchAdminBookings(adminToken),
        fetchAdminStats(adminToken),
        fetchDiscountSetting(adminToken),
        fetchSiteSetting(adminToken),
      ]);
      setBookings(bookingData);
      setStats(statsData);
      setDiscountEnabled(discountSetting.discountEnabled);
      setSiteDown(Boolean(siteSetting.siteDown));
      setAccess(statsData.access);
    } catch (error) {
      clearAdminToken();
      router.push("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    const storedToken = getAdminToken();
    if (!storedToken) {
      router.push("/admin/login");
      return;
    }
    Promise.resolve().then(() => loadData(storedToken));
  }, [loadData, router]);

  const canManage = Boolean(access?.canManage);

  async function changeStatus(id, status) {
    const adminToken = getAdminToken();
    await updateBookingStatus(id, status, adminToken);
    await loadData(adminToken);
  }

  async function clearAllData() {
    const adminToken = getAdminToken();
    await resetBookings(adminToken);
    setResetPopupOpen(false);
    await loadData(adminToken);
  }

  async function toggleDiscount(event) {
    const nextValue = event.target.checked;
    const adminToken = getAdminToken();
    setSavingDiscount(true);
    try {
      const setting = await updateDiscountSetting(nextValue, adminToken);
      setDiscountEnabled(setting.discountEnabled);
    } catch (error) {
      setSettingsPopup({ title: "Unable to update discount", message: error.message, type: "danger" });
    } finally {
      setSavingDiscount(false);
    }
  }

  async function toggleSiteStatus(nextValue) {
    const adminToken = getAdminToken();
    setSavingSiteStatus(true);
    try {
      const setting = await updateSiteSetting(nextValue, adminToken);
      const updatedSiteDown = Boolean(setting.siteDown);
      setSiteDown(updatedSiteDown);
      setSettingsPopup({
        title: updatedSiteDown ? "Site is now down" : "Site is live again",
        message: updatedSiteDown
          ? "Visitors will see a temporary unavailable page. Admin access remains available."
          : "Visitors can access the booking site again.",
        type: updatedSiteDown ? "danger" : "success",
      });
    } catch (error) {
      setSettingsPopup({ title: "Unable to update site status", message: error.message, type: "danger" });
    } finally {
      setSavingSiteStatus(false);
    }
  }

  async function addNormalAdmin(event) {
    event.preventDefault();
    const adminToken = getAdminToken();
    setCreatingAdmin(true);
    try {
      const result = await createNormalAdmin(newAdminName, newAdminPassword, adminToken);
      setNewAdminResult(result);
      setNewAdminName("");
      setNewAdminPassword("");
    } catch (error) {
      setSettingsPopup({ title: "Unable to add admin", message: error.message, type: "danger" });
    } finally {
      setCreatingAdmin(false);
    }
  }

  function closeAddAdmin() {
    setAddAdminOpen(false);
    setNewAdminName("");
    setNewAdminPassword("");
    setNewAdminResult(null);
  }

  function logout() {
    clearAdminToken();
    router.push("/admin/login");
  }

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (filter === "all" ? bookings : bookings.filter((booking) => booking.status === filter)).filter(
      (booking) => {
        if (!query) return true;
        return [
          booking.id,
          booking.name,
          booking.email,
          booking.phone,
          booking.gstNumber,
          booking.paymentMethod,
          booking.status,
          ...(booking.seats || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      },
    );
    return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [bookings, filter, search]);

  function exportExcel() {
    const rows = buildExportRows(filteredBookings);
    const html = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <table border="1">
            <thead><tr>${EXPORT_HEADERS.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
            <tbody>
              ${rows
                .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
                .join("")}
            </tbody>
          </table>
        </body>
      </html>`;
    downloadFile(`bni-kutch-bookings-${getDateStamp()}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
  }

  function exportCsv() {
    const rows = [EXPORT_HEADERS, ...buildExportRows(filteredBookings)];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    downloadFile(`bni-kutch-bookings-${getDateStamp()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function printReport() {
    window.print();
  }

  async function refreshData() {
    const adminToken = getAdminToken();
    if (!adminToken) {
      router.push("/admin/login");
      return;
    }
    await loadData(adminToken);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/bni-logo.jpg" alt="BNI Kutch" />
          <div>{!access ? "Admin Dashboard" : canManage ? "Super Admin" : "Admin Data Access"}</div>
        </div>
        <div className={styles.headerLinks}>
          {access && (
            <Link href="/admin/scanner" className={styles.addAdminHeaderBtn}>
              QR Scanner
            </Link>
          )}
          {canManage && (
            <button className={styles.addAdminHeaderBtn} type="button" onClick={() => setAddAdminOpen(true)}>
              Add Admin
            </button>
          )}
          <Link href="/">Back to Booking</Link>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <div className={styles.container}>
        <section className={styles.discountControl}>
          <div>
            <h2>BNI Member Discount</h2>
            <p>
              {discountEnabled
                ? "Enabled: eligible BNI members receive discounted pricing."
                : "Disabled: standard pricing applies to every user."}
            </p>
          </div>
          {!access ? (
            <span className={styles.viewerBadge}>Loading</span>
          ) : canManage ? (
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={discountEnabled}
                onChange={toggleDiscount}
                disabled={savingDiscount}
                aria-label="Enable BNI member discount"
              />
              <span className={styles.slider} />
              <strong>{savingDiscount ? "Saving..." : discountEnabled ? "On" : "Off"}</strong>
            </label>
          ) : (
            <span className={styles.viewerBadge}>Data access</span>
          )}
        </section>

        <section className={`${styles.discountControl} ${siteDown ? styles.dangerControl : ""}`}>
          <div>
            <h2>Site Status</h2>
            <p>
              {siteDown
                ? "Down: visitors will see the temporary unavailable page."
                : "Live: visitors can access the booking site."}
            </p>
          </div>
          {!access ? (
            <span className={styles.viewerBadge}>Loading</span>
          ) : canManage && siteDown ? (
            <button
              className={`${styles.btn} ${styles.btnConfirm}`}
              type="button"
              onClick={() => toggleSiteStatus(false)}
              disabled={savingSiteStatus}
            >
              {savingSiteStatus ? "Saving..." : "Make Site Live"}
            </button>
          ) : canManage ? (
            <button
              className={`${styles.btn} ${styles.btnReject}`}
              type="button"
              onClick={() => toggleSiteStatus(true)}
              disabled={savingSiteStatus}
            >
              {savingSiteStatus ? "Saving..." : "Take Site Down"}
            </button>
          ) : (
            <span className={styles.viewerBadge}>Super Admin only</span>
          )}
        </section>

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
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search booking, name, phone, seat..."
          />
          <button className={`${styles.filterBtn} ${styles.exportBtn}`} onClick={exportExcel} disabled={!filteredBookings.length}>
            Export Excel
          </button>
          <button className={`${styles.filterBtn} ${styles.exportBtn}`} onClick={exportCsv} disabled={!filteredBookings.length}>
            Export CSV
          </button>
          <button className={`${styles.filterBtn} ${styles.printBtn}`} onClick={printReport} disabled={!filteredBookings.length}>
            Print
          </button>
          <button className={`${styles.filterBtn} ${styles.refreshBtn}`} onClick={refreshData}>
            Refresh
          </button>
          {canManage && (
            <button className={`${styles.filterBtn} ${styles.resetBtn}`} onClick={() => setResetPopupOpen(true)}>
              Reset All Data
            </button>
          )}
        </div>

        {!filteredBookings.length ? (
          <div className={styles.empty}>
            <h3>No bookings found</h3>
            <p>Bookings made on the main page will appear here.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>GST No.</th>
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
                        {booking.phone || "Phone not added"}
                      </small>
                    </td>
                    <td>{booking.gstNumber || "-"}</td>
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
                        <br />
                        Method {(booking.paymentMethod || "upi").toUpperCase()}
                      </small>
                    </td>
                    <td>
                      <PaymentProof booking={booking} onOpen={setModalSrc} />
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge${booking.status}`]}`}>{booking.status}</span>
                    </td>
                    <td>{new Date(booking.date).toLocaleDateString("en-IN")}</td>
                    <td>
                      <ActionButtons booking={booking} onChange={changeStatus} canVerify={canManage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className={styles.mobileBookings}>
              {filteredBookings.map((booking) => (
                <article className={styles.mobileBooking} key={booking.id}>
                  <div className={styles.mobileBookingHead}>
                    <div>
                      <strong>{booking.id}</strong>
                      <small>{new Date(booking.date).toLocaleString("en-IN")}</small>
                    </div>
                    <span className={`${styles.badge} ${styles[`badge${booking.status}`]}`}>{booking.status}</span>
                  </div>

                  <div className={styles.mobileCustomer}>
                    <div>
                      <span>Customer</span>
                      <strong>{booking.name}</strong>
                      <small>{booking.email}</small>
                      <small>{booking.phone || "Phone not added"}</small>
                    </div>
                    <div className={styles.mobileTotal}>
                      <span>Total</span>
                      <strong>{formatMoney(booking.total)}</strong>
                    </div>
                  </div>

                  <div className={styles.mobileSeats}>
                    <span>Seats</span>
                    <div>
                      {booking.seats.map((seat) => (
                        <span className={styles.seatTag} key={seat}>
                          {seat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <dl className={styles.mobileDetails}>
                    <div>
                      <dt>GST No.</dt>
                      <dd>{booking.gstNumber || "-"}</dd>
                    </div>
                    <div>
                      <dt>Base + GST</dt>
                      <dd>{formatMoney(booking.baseAmount)} + {formatMoney(booking.gst)}</dd>
                    </div>
                    <div>
                      <dt>Payment</dt>
                      <dd>{(booking.paymentMethod || "upi").toUpperCase()}</dd>
                    </div>
                    <div>
                      <dt>Proof</dt>
                      <dd><PaymentProof booking={booking} onOpen={setModalSrc} compact /></dd>
                    </div>
                  </dl>

                  <div className={styles.mobileActions}>
                    <ActionButtons booking={booking} onChange={changeStatus} canVerify={canManage} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {modalSrc && (
        <button className={styles.modal} onClick={() => setModalSrc("")}>
          <img src={modalSrc} alt="Payment Screenshot" />
        </button>
      )}

      {addAdminOpen && (
        <div className={styles.accessModalBackdrop} role="presentation" onClick={closeAddAdmin}>
          <form className={styles.accessModal} onSubmit={addNormalAdmin} onClick={(event) => event.stopPropagation()}>
            <div className={styles.accessModalHeader}>
              <h2>Add Admin</h2>
              <button className={styles.accessModalClose} type="button" onClick={closeAddAdmin} aria-label="Close">
                &times;
              </button>
            </div>
            <p>Normal admins can see booking data and export reports, but cannot verify, reject, reset, or change discounts.</p>
            {!newAdminResult ? (
              <>
                <label htmlFor="newAdminName">Admin Name</label>
                <input
                  id="newAdminName"
                  value={newAdminName}
                  onChange={(event) => setNewAdminName(event.target.value)}
                  placeholder="Enter admin name"
                  minLength={2}
                  maxLength={80}
                  required
                />
                <label htmlFor="newAdminPassword">Password</label>
                <input
                  id="newAdminPassword"
                  type="password"
                  value={newAdminPassword}
                  onChange={(event) => setNewAdminPassword(event.target.value)}
                  placeholder="Set admin password"
                  minLength={8}
                  required
                />
                <button className={`${styles.btn} ${styles.btnConfirm} ${styles.accessCreateBtn}`} disabled={creatingAdmin}>
                  {creatingAdmin ? "Creating..." : "Create Admin"}
                </button>
              </>
            ) : (
              <div className={styles.accessResult}>
                <strong>{newAdminResult.displayName}</strong>
                <span>Normal Admin Created</span>
                <p>They can log in using the password you assigned.</p>
              </div>
            )}
          </form>
        </div>
      )}

      <AppPopup
        open={resetPopupOpen}
        title="Reset all bookings?"
        message="This will delete all bookings and release all seats except the default blocked seats. This action cannot be undone."
        type="danger"
        confirmLabel="Reset Data"
        cancelLabel="Cancel"
        onConfirm={clearAllData}
        onCancel={() => setResetPopupOpen(false)}
      />
      <AppPopup
        open={Boolean(settingsPopup)}
        title={settingsPopup?.title}
        message={settingsPopup?.message}
        type={settingsPopup?.type}
        onConfirm={() => setSettingsPopup(null)}
      />
    </main>
  );
}

function ActionButtons({ booking, onChange, canVerify }) {
  if (!canVerify) {
    return <span className={styles.viewerBadge}>Data access</span>;
  }

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
    <button className={`${styles.btn} ${styles.btnRejectedDisabled} ${styles.btnSm}`} disabled>
      Rejected Final
    </button>
  );
}

function PaymentProof({ booking, onOpen, compact = false }) {
  if (!booking.screenshot) return <span className={styles.noProof}>Cash payment</span>;

  return (
    <button type="button" className={`${styles.thumbButton} ${compact ? styles.compactProof : ""}`} onClick={() => onOpen(booking.screenshot)}>
      {compact ? "View" : <img className={styles.thumb} src={booking.screenshot} alt="Payment Screenshot" />}
    </button>
  );
}

function buildExportRows(bookings) {
  return bookings.map((booking) => [
    booking.id || "",
    booking.name || "",
    booking.email || "",
    booking.phone || "",
    booking.gstNumber || "",
    (booking.seats || []).join(", "),
    booking.baseAmount ?? "",
    booking.gst ?? "",
    booking.total ?? "",
    (booking.paymentMethod || "upi").toUpperCase(),
    booking.status || "",
    booking.date ? new Date(booking.date).toLocaleString("en-IN") : "",
    (booking.priceBreakup || []).map((item) => `${item.id}: ${item.priceType} ${item.price}`).join(" | "),
  ]);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDateStamp() {
  return new Date().toISOString().slice(0, 10);
}
