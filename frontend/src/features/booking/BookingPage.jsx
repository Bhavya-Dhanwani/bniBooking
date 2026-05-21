"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBooking, fetchSeatStatus } from "@/services/api";
import { PDF_LAYOUT, REMOVED_SEAT_IDS, getSeatCategory, getPreBookedSeatIds, sofaRows } from "@/shared/seatMap";
import { calculateTotals, formatMoney } from "@/shared/money";
import styles from "./booking.module.css";

function Seat({ id, label, cat, price, extraPrice, status, selected, onToggle, pdfStyle }) {
  const className = [
    styles.seat,
    pdfStyle ? styles.pdfSeat : "",
    styles[cat],
    status !== "available" ? styles[status] : "",
    selected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      style={pdfStyle}
      title={`${id} - Standard ${formatMoney(price)} / Additional ${formatMoney(extraPrice || price)} + 18% GST`}
      onClick={() => onToggle({ id, label, cat, price, extraPrice: extraPrice || price })}
      disabled={status !== "available"}
    >
      {label}
    </button>
  );
}

export default function BookingPage() {
  const [seatStatus, setSeatStatus] = useState({});
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paid, setPaid] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", gstNumber: "" });
  const [fileLabel, setFileLabel] = useState("Click here to upload screenshot");
  const [screenshot, setScreenshot] = useState("");
  const [loading, setLoading] = useState(false);
  const paymentRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchSeatStatus()
      .then(setSeatStatus)
      .catch((error) => alert(error.message));
  }, []);

  const totals = useMemo(() => calculateTotals(selectedSeats), [selectedSeats]);

  const upiQrSrc = useMemo(() => `/api/upi-qr?amount=${totals.total}`, [totals.total]);
  const preBookedSeatIds = useMemo(() => new Set(getPreBookedSeatIds()), []);
  const pdfScale = 1.56;

  function toggleSeat(seat) {
    if (seatStatus[seat.id] && seatStatus[seat.id] !== "available") return;

    const exists = selectedSeats.some((selected) => selected.id === seat.id);
    if (exists) {
      setSelectedSeats((current) => current.filter((selected) => selected.id !== seat.id));
      return;
    }

    setSelectedSeats((current) => [...current, seat]);
  }

  function proceedToPayment() {
    setPaymentVisible(true);
    requestAnimationFrame(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileLabel("Click here to upload screenshot");
      setScreenshot("");
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      alert("PNG, JPG or JPEG only, max 2MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(String(reader.result));
      setFileLabel(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function submitBooking() {
    if (!form.name.trim()) return alert("Please enter your full name.");
    if (!form.email.trim().includes("@")) return alert("Please enter a valid email address.");
    if (!form.phone.trim() || form.phone.trim().length < 10) return alert("Please enter a valid phone number.");
    if (!screenshot) return alert("Please upload the payment screenshot.");

    setLoading(true);
    try {
      const booking = await createBooking({
        name: form.name,
        email: form.email,
        phone: form.phone,
        gstNumber: form.gstNumber,
        seats: selectedSeats.map((seat) => seat.id),
        screenshot,
      });

      setSeatStatus((current) => ({
        ...current,
        ...selectedSeats.reduce((map, seat) => ({ ...map, [seat.id]: "pending" }), {}),
      }));
      alert(
        `Booking submitted!\nBooking ID: ${booking.id}\nTotal Paid: ${formatMoney(
          booking.total,
        )} (incl. 18% GST)\n\nAdmin will verify your payment shortly.`,
      );
      setSelectedSeats([]);
      setPaymentVisible(false);
      setPaid(false);
      setForm({ name: "", email: "", phone: "", gstNumber: "" });
      setScreenshot("");
      setFileLabel("Click here to upload screenshot");
      if (fileRef.current) fileRef.current.value = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedIds = new Set(selectedSeats.map((seat) => seat.id));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img className={styles.logoImg} src="/bni-logo.jpg" alt="BNI Kutch Logo" />
          <div className={styles.brandText}>
            BNI Kutch
            <small>Changing the Way the World Does Business</small>
          </div>
        </div>
        <div className={styles.eventMeta}>
          <h1>Laksh Maheshwari Live</h1>
          <p>Exclusive Event | BNI Kutch Chapter</p>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.capNotice}>
          <strong>Pricing Rule:</strong> A member gets standard pricing for <strong>1 Sofa seat</strong> and{" "}
          <strong>up to 2 Chair seats</strong>. If more seats are selected, additional seats are charged at the higher
          additional-seat rate shown below. <strong>18% GST is added on the total.</strong>
        </div>

        <div className={styles.legend}>
          <Legend color="platinum" text="Sofa Platinum (₹9,000)" />
          <Legend color="gold" text="Sofa Gold (₹6,000)" />
          <Legend color="ground" text="Ground Chair (₹999)" />
          <Legend color="balcony" text="First Floor Chair (₹699)" />
          <Legend color="selected" text="Selected" />
          <Legend color="pending" text="Pending" />
          <Legend color="booked" text="Booked" />
        </div>

        <PriceTable />

        <div className={styles.seatMapWrapper}>
          <div className={styles.stage}>S T A G E</div>

          <div className={styles.sectionTitle}>Sofa Seating - Ground Floor</div>
          <div className={styles.sofaRows}>
            {sofaRows.map((row) => (
              <div className={styles.sofaRow} key={row.id}>
                <div className={styles.seatBlock}>
                  {Array.from({ length: row.left }, (_, index) => (
                    <Seat
                      key={`${row.id}-L-${index + 1}`}
                      id={`${row.id}-L-${index + 1}`}
                      label={index + 1}
                      cat={row.cat}
                      price={row.price}
                      extraPrice={row.extraPrice}
                      status={
                        preBookedSeatIds.has(`${row.id}-L-${index + 1}`)
                          ? "booked"
                          : seatStatus[`${row.id}-L-${index + 1}`] || "available"
                      }
                      selected={selectedIds.has(`${row.id}-L-${index + 1}`)}
                      onToggle={toggleSeat}
                    />
                  ))}
                </div>
                <div className={styles.rowLabel}>{row.label}</div>
                <div className={styles.seatBlock}>
                  {Array.from({ length: row.right }, (_, index) => (
                    <Seat
                      key={`${row.id}-R-${index + 1}`}
                      id={`${row.id}-R-${index + 1}`}
                      label={index + 1}
                      cat={row.cat}
                      price={row.price}
                      extraPrice={row.extraPrice}
                      status={
                        preBookedSeatIds.has(`${row.id}-R-${index + 1}`)
                          ? "booked"
                          : seatStatus[`${row.id}-R-${index + 1}`] || "available"
                      }
                      selected={selectedIds.has(`${row.id}-R-${index + 1}`)}
                      onToggle={toggleSeat}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sectionTitle}>Ground Floor Seating &amp; First Floor Seating</div>
          <div className={styles.pdfMapScroll}>
            <div
              className={styles.pdfSeatMap}
              style={{ width: `${PDF_LAYOUT.w * pdfScale}px`, height: `${PDF_LAYOUT.h * pdfScale}px` }}
            >
              <div className={styles.mapFloorLabel} style={{ top: "8px" }}>
                GROUND FLOOR SEATING
              </div>
              <div className={styles.mapFloorLabel} style={{ top: `${106 * pdfScale}px` }}>
                FIRST FLOOR SEATING
              </div>
              {PDF_LAYOUT.seats
                .filter((seat) => !REMOVED_SEAT_IDS.has(seat.id))
                .map((seat) => (
                  <Seat
                    key={seat.id}
                    id={seat.id}
                    label={seat.label}
                    cat={seat.cat}
                    price={seat.price}
                    extraPrice={seat.extraPrice}
                    status={seatStatus[seat.id] || "available"}
                    selected={selectedIds.has(seat.id)}
                    onToggle={toggleSeat}
                    pdfStyle={{
                      left: `${seat.x * pdfScale}px`,
                      top: `${seat.y * pdfScale}px`,
                      width: `${seat.w * pdfScale}px`,
                      height: `${seat.h * pdfScale}px`,
                    }}
                  />
                ))}
            </div>
          </div>
        </div>

        {paymentVisible && (
          <section className={styles.paymentSection} ref={paymentRef}>
            <h2>Complete Payment</h2>
            <OrderSummary selectedSeats={selectedSeats} totals={totals} />

            <div className={styles.paymentGrid}>
              <div className={styles.paymentBox}>
                <h3 className={styles.paymentTitle}>UPI Payment</h3>
                <div className={styles.qrBox}>
                  <img
                    className={styles.qrImage}
                    src={upiQrSrc}
                    alt={`UPI QR code for ${formatMoney(totals.total)} payable to munjalshah9@okicici`}
                  />
                </div>
                <p className={styles.upiId}>munjalshah9@okicici</p>
                <p className={styles.upiAmount}>Fixed amount: {formatMoney(totals.total)}</p>
                <p className={styles.upiApps}>GPay · PhonePe · Paytm · Any UPI App</p>
              </div>
              <div className={styles.paymentBox}>
                <h3 className={styles.paymentTitle}>Bank Transfer</h3>
                <p className={styles.bankDetails}>
                  <strong>Account Name:</strong> Imperial Innoventures
                  <br />
                  <strong>Account Number:</strong> 0114137470
                  <br />
                  <strong>Bank:</strong> Kotak Mahindra Bank
                  <br />
                  <strong>Branch:</strong> Gandhidham Branch
                  <br />
                  <strong>IFSC Code:</strong> KKBK0000822
                </p>
              </div>
            </div>

            <div className={styles.paidConfirm}>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
                <span>I have completed the payment</span>
              </label>
            </div>

            {paid && (
              <div className={styles.uploadForm}>
                <label>Full Name</label>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter your full name" />
                <label>Email Address</label>
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Enter your email address" />
                <label>Phone Number</label>
                <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Enter your phone number" />
                <label>GST Number (Optional)</label>
                <input
                  value={form.gstNumber}
                  onChange={(event) => setForm({ ...form, gstNumber: event.target.value.toUpperCase() })}
                  placeholder="Enter GSTIN for invoice (optional)"
                  maxLength={15}
                />
                <label>Payment Screenshot</label>
                <button type="button" className={styles.uploadWrap} onClick={() => fileRef.current?.click()}>
                  <span className={screenshot ? styles.fileSelected : ""}>{fileLabel}</span>
                  <small>PNG, JPG or JPEG (max 2MB)</small>
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" hidden onChange={handleFileChange} />
                <button className={`${styles.btn} ${styles.btnPrimary} ${styles.fullButton}`} onClick={submitBooking} disabled={loading}>
                  {loading ? "Submitting..." : "Complete Booking"}
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      <div className={styles.bookingPanel}>
        <div className={styles.panelInfo}>
          <small>Selected Seats ({selectedSeats.length})</small>
          <div className={styles.selectedTags}>
            {selectedSeats.map((seat) => (
              <span className={styles.tag} key={seat.id}>
                {seat.id} ({formatMoney(totals.items.find((item) => item.id === seat.id)?.chargedPrice || seat.price)}{" "}
                {totals.items.find((item) => item.id === seat.id)?.priceLabel})
              </span>
            ))}
          </div>
        </div>
        <div className={styles.panelAction}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setSelectedSeats([])}>
            Clear
          </button>
          <div>
            <div className={styles.total}>{formatMoney(totals.total)}</div>
            <div className={styles.gstText}>incl. 18% GST</div>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={proceedToPayment} disabled={!selectedSeats.length}>
            Proceed to Pay
          </button>
        </div>
      </div>
    </main>
  );
}

function PriceTable() {
  return (
    <div className={styles.priceCard}>
      <h2>Ticket Categories &amp; Prices</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Details</th>
            <th>Standard Price</th>
            <th>Additional Seat Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sofa - Platinum</td>
            <td>Rows: 2, 3, 4</td>
            <td>{formatMoney(9000)}</td>
            <td>{formatMoney(11000)}</td>
          </tr>
          <tr>
            <td>Sofa - Gold</td>
            <td>Rows: 5, 6, 7, 8</td>
            <td>{formatMoney(6000)}</td>
            <td>{formatMoney(7500)}</td>
          </tr>
          <tr>
            <td>Chair - Ground Floor</td>
            <td>Prime chair seating</td>
            <td>{formatMoney(999)}</td>
            <td>{formatMoney(1199)}</td>
          </tr>
          <tr>
            <td>Chair - First Floor</td>
            <td>First floor chair seating</td>
            <td>{formatMoney(699)}</td>
            <td>{formatMoney(899)}</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Standard price applies to 1 Sofa seat and up to 2 Chair seats. Additional selected seats use the higher
        additional-seat price. 18% GST extra.</strong>
        <br />
        Sofa Row 1 and Sofa Row 5 are already booked and shown in grey.
      </p>
    </div>
  );
}

function Legend({ color, text }) {
  return (
    <div className={styles.legendItem}>
      <div className={`${styles.legendBox} ${styles[`legend${color}`]}`} />
      {text}
    </div>
  );
}

function OrderSummary({ selectedSeats, totals }) {
  return (
    <table className={styles.summaryTable}>
      <thead>
        <tr>
          <th>Seat</th>
          <th>Category</th>
          <th>Base Price</th>
        </tr>
      </thead>
      <tbody>
        {totals.items.map((seat) => (
          <tr key={seat.id}>
            <td>{seat.id}</td>
            <td>
              {getSeatCategory(seat.cat)} <small>({seat.priceLabel})</small>
            </td>
            <td>{formatMoney(seat.chargedPrice)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className={styles.gstRow}>
          <td colSpan="2">Subtotal</td>
          <td>{formatMoney(totals.base)}</td>
        </tr>
        <tr className={styles.gstRow}>
          <td colSpan="2">GST @ 18%</td>
          <td>{formatMoney(totals.gst)}</td>
        </tr>
        <tr className={styles.totalRow}>
          <td colSpan="2">Total Payable (incl. GST)</td>
          <td>{formatMoney(totals.total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
