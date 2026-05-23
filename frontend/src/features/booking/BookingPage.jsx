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
      title={`${id} - Discounted ${formatMoney(price)} / Standard ${formatMoney(extraPrice || price)} + 18% GST`}
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
  const [paymentMethod, setPaymentMethod] = useState("upi");
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
  const selectedIds = new Set(selectedSeats.map((seat) => seat.id));
  const pdfDisplayWidth = 1180;
  const pdfScale = pdfDisplayWidth / PDF_LAYOUT.w;

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
    if (paymentMethod !== "cash" && !screenshot) return alert("Please upload the payment screenshot.");

    setLoading(true);
    try {
      const booking = await createBooking({
        name: form.name,
        email: form.email,
        phone: form.phone,
        gstNumber: form.gstNumber,
        seats: selectedSeats.map((seat) => seat.id),
        paymentMethod,
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
      setPaymentMethod("upi");
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

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>An Evening of Poetry & Stories</span>
          <OrnateDivider />
          <h1 className={styles.heroTitle}>
            Laksh Maheshwari <br />
            <span>LIVE</span>
          </h1>
          <p className={styles.urduLine}>Shayari · Kahaaniyan · Mausiqi</p>
          <p className={styles.heroSub}>
            A soulful mehfil hosted by BNI Kutch. Select seats, review GST-inclusive pricing, and complete payment for
            admin verification.
          </p>
          <div className={styles.heroMeta}>
            <span>BNI Kutch Chapter</span>
            <span>Premium Sofa & Chair Seating</span>
            <span>Secure Verification</span>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <div className={styles.ruleCard}>
          <div className={styles.ruleIcon}>*</div>
          <div className={styles.ruleBody}>
            <strong>Pricing Rule:</strong> Discounted pricing applies to <strong>1 Sofa</strong> <em>OR</em>{" "}
            <strong>up to 2 Chairs</strong> per booking - <u>whichever you pick first</u>. Once that allowance is used,
            every additional seat (extra sofa, extra chair, or seats of the other type) is charged at the{" "}
            <strong>Standard</strong> rate shown below.{" "}
            <strong>18% GST is added on the total.</strong>
          </div>
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
          <div className={styles.stageWrap}>
            <div className={`${styles.lantern} ${styles.lanternLeft}`} />
            <div className={`${styles.lantern} ${styles.lanternRight}`} />
            <div className={styles.stage}>MEHFIL</div>
          </div>

          <div className={styles.sectionTitle}>Diwan-e-Khas - Sofa Seating</div>
          <div className={styles.sofaRows}>
            {sofaRows.map((row) => (
              <div className={styles.sofaRow} key={row.id}>
                <div className={styles.seatBlock}>
                  {Array.from({ length: row.left }, (_, index) => {
                    const id = `${row.id}-L-${index + 1}`;
                    return (
                      <Seat
                        key={id}
                        id={id}
                        label={index + 1}
                        cat={row.cat}
                        price={row.price}
                        extraPrice={row.extraPrice}
                        status={preBookedSeatIds.has(id) ? "booked" : seatStatus[id] || "available"}
                        selected={selectedIds.has(id)}
                        onToggle={toggleSeat}
                      />
                    );
                  })}
                </div>
                <div className={styles.rowLabel}>{row.label}</div>
                <div className={styles.seatBlock}>
                  {Array.from({ length: row.right }, (_, index) => {
                    const id = `${row.id}-R-${index + 1}`;
                    return (
                      <Seat
                        key={id}
                        id={id}
                        label={index + 1}
                        cat={row.cat}
                        price={row.price}
                        extraPrice={row.extraPrice}
                        status={preBookedSeatIds.has(id) ? "booked" : seatStatus[id] || "available"}
                        selected={selectedIds.has(id)}
                        onToggle={toggleSeat}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sectionTitle}>Mehfil Seating - Ground &amp; First Floor</div>
          <div className={styles.pdfMapScroll}>
            <div
              className={styles.pdfSeatMap}
              style={{
                width: `${pdfDisplayWidth}px`,
                height: `${PDF_LAYOUT.h * pdfScale}px`,
                backgroundImage: `url('/${PDF_LAYOUT.image}')`,
              }}
            >
              <div className={styles.mapFloorLabel} style={{ top: "8px" }}>
                GROUND FLOOR SEATING
              </div>
              <div className={`${styles.mapFloorLabel} ${styles.firstFloor}`} style={{ top: `${106 * pdfScale}px` }}>
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
            <div className={styles.stepBar}>
              <div className={styles.step}>
                <span>1</span> Select Seats
              </div>
              <div className={`${styles.step} ${styles.stepActive}`}>
                <span>2</span> Review &amp; Pay
              </div>
              <div className={styles.step}>
                <span>3</span> Admin Verification
              </div>
            </div>
            <h2>Payment &amp; Confirmation</h2>
            <p className={styles.paymentIntro}>
              Review your selection, complete payment, and upload the screenshot for admin verification. 18% GST is
              included in the total.
            </p>
            <OrderSummary selectedSeats={selectedSeats} totals={totals} />

            <div className={styles.paymentMethodPicker}>
              <label htmlFor="paymentMethod">Select Payment Method</label>
              <select
                id="paymentMethod"
                className={styles.pmSelect}
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="upi">UPI - Scan QR / pay to munjalshah9@okicici</option>
                <option value="imps">IMPS / NEFT - Bank Transfer</option>
                <option value="cash">Cash - Pay at the venue</option>
              </select>
            </div>

            <div className={styles.paymentMethodPanels}>
              {paymentMethod === "upi" && (
                <div className={styles.pmPanel}>
                  <h3 className={styles.pmTitle}>UPI Payment</h3>
                  <div className={styles.qrBox}>
                    <img
                      className={styles.qrImage}
                      src={upiQrSrc}
                      alt={`UPI QR code for ${formatMoney(totals.total)} payable to munjalshah9@okicici`}
                    />
                  </div>
                  <p className={styles.upiId}>UPI ID: munjalshah9@okicici</p>
                  <p className={styles.upiAmount}>Fixed amount: {formatMoney(totals.total)}</p>
                  <p className={styles.upiApps}>GPay · PhonePe · Paytm · Any UPI App</p>
                </div>
              )}

              {paymentMethod === "imps" && (
                <div className={styles.pmPanel}>
                  <h3 className={styles.pmTitle}>IMPS / NEFT - Bank Transfer</h3>
                  <div className={styles.bankGrid}>
                    <div><span>Account Name</span><strong>Imperial Innoventures</strong></div>
                    <div><span>Account Number</span><strong>0114137470</strong></div>
                    <div><span>Bank</span><strong>Kotak Mahindra Bank</strong></div>
                    <div><span>Branch</span><strong>Gandhidham Branch</strong></div>
                    <div><span>IFSC Code</span><strong>KKBK0000822</strong></div>
                  </div>
                </div>
              )}

              {paymentMethod === "cash" && (
                <div className={styles.pmPanel}>
                  <h3 className={styles.pmTitle}>Pay in Cash at the BNI Kutch Regional Office</h3>
                  <p className={styles.cashText}>
                    Please pay at the BNI Kutch Regional Office on the booking day. Your seats will be marked as pending
                    until the admin confirms the cash receipt.
                  </p>
                  <p className={styles.contactNote}>
                    Booking: Aditya Sharma +91 99988 13569 | Sponsorship Query: Raj Shah +91 72111 99992 | Meet
                    Morbia: +91 88666 99994
                  </p>
                  <p className={styles.cashNote}>For cash bookings, payment screenshot upload is optional.</p>
                </div>
              )}
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
                <label>Payment Screenshot{paymentMethod === "cash" ? " (Optional)" : ""}</label>
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

        <section className={styles.eventContactCard}>
          <h3>Event Contact Details</h3>
          <div className={styles.eventContactGrid}>
            <div className={styles.eventContactBox}>
              <div className={styles.contactLabel}>Booking Query</div>
              <div className={styles.contactName}>Aditya Sharma</div>
              <a href="tel:+919998813569">+91 99988 13569</a>
            </div>
            <div className={styles.eventContactBox}>
              <div className={styles.contactLabel}>Sponsorship Query</div>
              <div className={styles.contactName}>Raj Shah</div>
              <a href="tel:+917211199992">+91 72111 99992</a>
              <div className={styles.meetMorbia}>
                <div className={styles.contactLabel}>Meet Morbia</div>
                <a href="tel:+918866699994">+91 88666 99994</a>
              </div>
            </div>
          </div>
        </section>

        <p className={styles.footerNote}>
          <span>*</span> An unforgettable evening of poetry, stories &amp; music <span>*</span>
          <br />
          © BNI Kutch Chapter · Presented with love
        </p>
      </div>

      <div className={styles.bookingPanel}>
        <div className={styles.panelInfo}>
          <small>Selected Seats ({selectedSeats.length})</small>
          <div className={styles.selectedTags}>
            {selectedSeats.map((seat) => (
              <span className={styles.tag} key={seat.id}>
                {seat.id} · {formatMoney(totals.items.find((item) => item.id === seat.id)?.chargedPrice || seat.price)}{" "}
                {totals.items.find((item) => item.id === seat.id)?.priceLabel === "Discounted" ? "✓" : "+"}
              </span>
            ))}
          </div>
          {totals.bundle && selectedSeats.length > 0 && <div className={styles.bundleHint}>{getBundleHint(totals.bundle)}</div>}
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

function OrnateDivider() {
  return (
    <div className={styles.ornateDivider} aria-hidden="true">
      <svg viewBox="0 0 220 24">
        <path d="M10 12H82" />
        <path d="M138 12H210" />
        <path d="M110 4c9 0 16 8 16 8s-7 8-16 8-16-8-16-8 7-8 16-8Z" />
        <circle cx="110" cy="12" r="3" />
      </svg>
    </div>
  );
}

function PriceCard({ tone, title, sub, standard, extra, swatchClass }) {
  return (
    <div className={`${styles.priceCard} ${styles[tone]}`}>
      <div className={styles.accent} />
      <div className={styles.pcTitle}>
        <span className={`${styles.swatch} ${styles[swatchClass]}`} />
        {title}
      </div>
      <div className={styles.pcSub}>{sub}</div>
      <div className={styles.priceRow}><span>Discounted</span><strong>{formatMoney(standard)}</strong></div>
      <div className={`${styles.priceRow} ${styles.extra}`}><span>Standard</span><strong>{formatMoney(extra)}</strong></div>
    </div>
  );
}

function getBundleHint(bundle) {
  if (bundle === "sofa") {
    return "✓ Sofa allowance active - 1 Sofa at Discounted. Any extra Sofa, and every Chair, is charged at the Standard rate.";
  }
  return "✓ Chair allowance active - up to 2 Chairs at Discounted. Any extra Chair, and every Sofa, is charged at the Standard rate.";
}

function PriceTable() {
  return (
    <div className={styles.pricingSection}>
      <div className={styles.pricingHeader}>
        <h2>Choose Your Seat in the Mehfil</h2>
        <p>Every seat brings you closer to the story. Prices are per seat, exclusive of 18% GST.</p>
      </div>
      <div className={styles.priceGrid}>
        <PriceCard tone="platinumCard" title="Sofa - Platinum" sub="Rows 2, 3, 4 · Most premium" standard={9000} extra={11000} swatchClass="legendplatinum" />
        <PriceCard tone="goldCard" title="Sofa - Gold" sub="Rows 5, 6, 7, 8 · Premium" standard={6000} extra={7500} swatchClass="legendgold" />
        <PriceCard tone="groundCard" title="Chair - Ground Floor" sub="Prime chair seating" standard={999} extra={1199} swatchClass="legendground" />
        <PriceCard tone="balconyCard" title="Chair - First Floor" sub="First-floor chair seating" standard={699} extra={899} swatchClass="legendbalcony" />
      </div>
      <p className={styles.preBookedNote}>Sofa Row 1 and Sofa Row 5 are already booked and shown in grey.</p>
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

function OrderSummary({ totals }) {
  return (
    <div className={styles.orderSummaryCard}>
      <h3>Order Summary</h3>
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
    </div>
  );
}
