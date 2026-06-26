"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBooking, fetchCurrentUser, fetchSeatStatus, logoutUser } from "@/services/api";
import { PDF_LAYOUT, REMOVED_SEAT_IDS, PRE_BOOKED_CHAIR_IDS, getSeatCategory, getPreBookedSeatIds, sofaRows } from "@/shared/seatMap";
import { calculateTotals, formatMoney, hasDiscountForCategory, NO_DISCOUNT_ALLOWANCE } from "@/shared/money";
import AppPopup from "@/shared/AppPopup";
import srkLogo from "@/assets/srk.png";
import khavdaLogo from "@/assets/khavda.png";
import adityaKLogo from "@/assets/adityak.png";
import padmavatiLogo from "@/assets/padmavati.png";
import sadhanaLogo from "@/assets/sadhana.png";
import krivoxxLogo from "@/assets/krivoxx.png";
import imperialLogo from "@/assets/imperial.png";
import itsqLogo from "@/assets/itsq.png";
import mhLogo from "@/assets/MH.png";
import touristLogo from "@/assets/tourist.png";
import carzapaLogo from "@/assets/carzspa.png";
import styles from "./booking.module.css";

function Seat({ id, label, cat, price, extraPrice, discountAllowance, status, selected, onToggle, pdfStyle }) {
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
      title={
        hasDiscountForCategory(cat, discountAllowance)
          ? `${id} - Discounted ${formatMoney(price)} / Standard ${formatMoney(extraPrice || price)} + 18% GST`
          : `${id} - Standard ${formatMoney(extraPrice || price)} + 18% GST`
      }
      onClick={() => onToggle({ id, label, cat, price, extraPrice: extraPrice || price })}
      disabled={status !== "available"}
    >
      {label}
    </button>
  );
}

export default function BookingPage() {
  const router = useRouter();
  const [seatStatus, setSeatStatus] = useState({});
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [phone, setPhone] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [fileLabel, setFileLabel] = useState("Click here to upload screenshot");
  const [screenshot, setScreenshot] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRendered, setMenuRendered] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [isBniMember, setIsBniMember] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountAllowance, setDiscountAllowance] = useState(NO_DISCOUNT_ALLOWANCE);
  const [currentUser, setCurrentUser] = useState(null);
  const paymentRef = useRef(null);
  const fileRef = useRef(null);

  const SAVED_STATE_KEY = "bni_booking_state";

  function saveBookingState() {
    try {
      sessionStorage.setItem(SAVED_STATE_KEY, JSON.stringify({
        selectedSeats,
        paymentMethod,
        phone,
        gstNumber,
      }));
    } catch { /* ignore */ }
  }

  function restoreSavedBookingState() {
    try {
      const saved = sessionStorage.getItem(SAVED_STATE_KEY);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (state.selectedSeats?.length) {
        setSelectedSeats(state.selectedSeats);
        setPaymentMethod(state.paymentMethod || "upi");
        setPhone(state.phone || "");
        setGstNumber(state.gstNumber || "");
        setPaymentVisible(true);
      }
      sessionStorage.removeItem(SAVED_STATE_KEY);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    Promise.all([fetchSeatStatus(), fetchCurrentUser()])
      .then(([status, { user, discountEnabled: discountsAvailable, discountAllowance: allowance }]) => {
        setSeatStatus(status);
        setCurrentUser(user);
        setIsBniMember(Boolean(user?.isBniMember));
        setDiscountEnabled(Boolean(discountsAvailable));
        setDiscountAllowance(allowance || NO_DISCOUNT_ALLOWANCE);
        if (user) restoreSavedBookingState();
      })
      .catch((error) => showPopup("Unable to load seats", error.message, "danger"));
  }, []);

  useEffect(() => {
    if (!menuRendered && !videoOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    function handleEscape(event) {
      if (event.key === "Escape") {
        closeMenu();
        setVideoOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuRendered, videoOpen]);

  useEffect(() => {
    if (menuOpen || !menuRendered) return undefined;
    const timeout = window.setTimeout(() => setMenuRendered(false), 260);
    return () => window.clearTimeout(timeout);
  }, [menuOpen, menuRendered]);

  const totals = useMemo(() => calculateTotals(selectedSeats, discountAllowance), [selectedSeats, discountAllowance]);
  const upiQrSrc = useMemo(() => `/api/upi-qr?amount=${totals.total}`, [totals.total]);
  const preBookedSeatIds = useMemo(() => new Set(getPreBookedSeatIds()), []);
  const selectedIds = new Set(selectedSeats.map((seat) => seat.id));
  const pdfDisplayWidth = 1180;
  const pdfScale = pdfDisplayWidth / PDF_LAYOUT.w;

  function showPopup(title, message, type = "info") {
    setPopup({ title, message, type });
  }

  function openMenu() {
    setMenuRendered(true);
    requestAnimationFrame(() => setMenuOpen(true));
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleSeat(seat) {
    if (!currentUser) {
      setPopup({
        title: "Login required",
        message: "Please login to select seats and proceed with booking.",
        type: "info",
        loginRedirect: true,
      });
      return;
    }

    if (seatStatus[seat.id] && seatStatus[seat.id] !== "available") return;

    const exists = selectedSeats.some((selected) => selected.id === seat.id);
    if (exists) {
      setSelectedSeats((current) => current.filter((selected) => selected.id !== seat.id));
      return;
    }

    setSelectedSeats((current) => [...current, seat]);
  }

  async function proceedToPayment() {
    setPaymentVisible(true);
    requestAnimationFrame(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

    try {
      const { user, discountEnabled: discountsAvailable, discountAllowance: allowance } = await fetchCurrentUser();
      setCurrentUser(user);
      setDiscountEnabled(Boolean(discountsAvailable));
      setDiscountAllowance(allowance || NO_DISCOUNT_ALLOWANCE);
    } catch {
      // Keep the current pricing state; booking submission will surface any real server issue.
    }
  }

  async function logout() {
    try {
      closeMenu();
      await logoutUser();
      router.push("/login");
      router.refresh();
    } catch (error) {
      showPopup("Logout failed", error.message, "danger");
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileLabel("Click here to upload screenshot");
      setScreenshot("");
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      showPopup("Invalid file", "PNG, JPG or JPEG only, max 2MB.", "danger");
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

  function changePaymentMethod(event) {
    const method = event.target.value;
    setPaymentMethod(method);
    setPaid(false);
    setScreenshot("");
    setFileLabel("Click here to upload screenshot");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submitBooking() {
    const phoneDigits = phone.replace(/\D/g, "");
    if (!phone.trim()) {
      return showPopup("Phone required", "Please enter your phone number.", "danger");
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return showPopup("Invalid phone", "Please enter a valid phone number.", "danger");
    }

    if (!screenshot) {
      return showPopup("Screenshot required", "Please upload the payment screenshot.", "danger");
    }

    if (!currentUser) {
      saveBookingState();
      router.push("/login?next=/");
      return;
    }

    setLoading(true);
    try {
      const booking = await createBooking({
        phone,
        gstNumber,
        seats: selectedSeats.map((seat) => seat.id),
        paymentMethod,
        screenshot,
      });

      setSeatStatus((current) => ({
        ...current,
        ...selectedSeats.reduce((map, seat) => ({ ...map, [seat.id]: "pending" }), {}),
      }));
      const confirmationMessage = `Booking submitted!\nBooking ID: ${booking.id}\nTotal Paid: ${formatMoney(
              booking.total,
            )} (incl. 18% GST)\n\nAdmin will verify your payment shortly.`;
      showPopup("Booking submitted", confirmationMessage, "success");
      setDiscountEnabled(Boolean(booking.discountEnabled));
      setDiscountAllowance(booking.discountAllowance || NO_DISCOUNT_ALLOWANCE);
      setSelectedSeats([]);
      sessionStorage.removeItem(SAVED_STATE_KEY);
      setPaymentVisible(false);
      setPaid(false);
      setPaymentMethod("upi");
      setPhone("");
      setGstNumber("");
      setScreenshot("");
      setFileLabel("Click here to upload screenshot");
      if (fileRef.current) fileRef.current.value = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      showPopup("Booking failed", error.message, "danger");
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
        <button
          className={styles.menuButton}
          type="button"
          aria-label="Open account menu"
          aria-expanded={menuOpen}
          aria-controls="account-menu"
          onClick={openMenu}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {menuRendered && (
        <>
          <button
            className={`${styles.menuBackdrop} ${menuOpen ? styles.menuBackdropOpen : ""}`}
            type="button"
            aria-label="Close account menu"
            onClick={closeMenu}
          />
          <aside
            className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
            id="account-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Account menu"
          >
            <div className={styles.sidebarTop}>
              <span>Account</span>
              <button className={styles.closeButton} type="button" aria-label="Close account menu" onClick={closeMenu}>
                <span />
                <span />
              </button>
            </div>
            <nav className={styles.headerActions} aria-label="Account actions">
              {currentUser ? (
                <>
                  <Link className={styles.headerActionLink} href="/dashboard" onClick={closeMenu}>
                    Dashboard
                  </Link>
                  <button className={styles.headerLogout} type="button" onClick={logout}>
                    Logout
                  </button>
                </>
              ) : (
                <Link className={styles.headerActionLink} href="/login" onClick={closeMenu}>
                  Login
                </Link>
              )}
            </nav>
          </aside>
        </>
      )}

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.sponsorHero}>
            <div className={styles.sponsorHeroItem}>
              <span className={styles.sponsorLabel}>Powered by</span>
              <img className={styles.sponsorHeroMain} src={srkLogo.src} alt="Powered by" />
            </div>
            <div className={styles.sponsorHeroItem}>
              <span className={styles.sponsorLabel}>Co-Sponser</span>
              <img className={styles.sponsorHeroSide} src={khavdaLogo.src} alt="Co-Sponser" />
            </div>
          </div>

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
          <button className={styles.artistVideoButton} type="button" onClick={() => setVideoOpen(true)}>
            <span className={styles.playIcon} aria-hidden="true" />
            Who is Laksh Maheshwari?
          </button>
          <div className={styles.heroMeta}>
            <span>BNI Kutch Chapter</span>
            <span>Premium Sofa & Chair Seating</span>
            <span>Secure Verification</span>
            <span>Date: 27th June 2026</span>
            <span>Time: 7 PM</span>
            <span>Venue: IFFCO Community Center</span>
          </div>
        </div>
      </section>

      {videoOpen && (
        <div className={styles.videoModalLayer} role="presentation" onClick={() => setVideoOpen(false)}>
          <section
            className={styles.videoModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="artist-video-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.videoModalHeader}>
              <h2 id="artist-video-title">Who is Laksh Maheshwari?</h2>
              <button className={styles.videoCloseButton} type="button" aria-label="Close video" onClick={() => setVideoOpen(false)}>
                <span />
                <span />
              </button>
            </div>
            <div className={styles.videoFrame}>
              <iframe
                src="https://www.youtube-nocookie.com/embed/xZUlRV7Vxdk?autoplay=1&rel=0"
                title="Who is Laksh Maheshwari?"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </section>
        </div>
      )}

      <div className={styles.container}>
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
                <div className={styles.contactName}>Meet Morbia</div>
                <a href="tel:+918866699994">+91 88666 99994</a>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.ruleCard}>
          <div className={styles.ruleIcon}>*</div>
          <div className={styles.ruleBody}>
            {isBniMember && !discountEnabled ? (
              <>
                <strong>Pricing Rule:</strong> Member discounts are currently unavailable. Standard pricing applies to
                all new bookings. <strong>18% GST is added on the total.</strong>
              </>
            ) : isBniMember && discountAllowance.category === "choice" ? (
              <>
                <strong>Pricing Rule:</strong> Your member discount applies once across your bookings:{" "}
                <strong>1 Sofa</strong> <em>OR</em> <strong>up to 2 Chairs</strong> -{" "}
                <u>whichever you pick first</u>. Once it is used, every further seat is charged at the{" "}
                <strong> Standard</strong> rate shown below.{" "}
                <strong>18% GST is added on the total.</strong>
              </>
            ) : isBniMember && discountAllowance.category === "chair" ? (
              <>
                <strong>Pricing Rule:</strong> You have <strong>{discountAllowance.chairRemaining} discounted Chair</strong>{" "}
                remaining in your member allowance. Sofa seats and seats after that are charged at the{" "}
                <strong> Standard</strong> rate. <strong>18% GST is added on the total.</strong>
              </>
            ) : isBniMember ? (
              <>
                <strong>Pricing Rule:</strong> Your member discount allowance has been used. Standard pricing applies
                to all new bookings. <strong>18% GST is added on the total.</strong>
              </>
            ) : (
              <>
                <strong>Pricing Rule:</strong> Standard pricing applies to all seats.{" "}
                <strong>18% GST is added on the total.</strong>
              </>
            )}
          </div>
        </div>

        <div className={styles.legend}>
          <Legend color="platinum" text={`Sofa Platinum (${formatMoney(hasDiscountForCategory("platinum", discountAllowance) ? 9000 : 11000)})`} />
          <Legend color="gold" text={`Sofa Gold (${formatMoney(hasDiscountForCategory("gold", discountAllowance) ? 6000 : 7500)})`} />
          <Legend color="ground" text={`Ground Chair (${formatMoney(hasDiscountForCategory("chair-ground", discountAllowance) ? 999 : 1199)})`} />
          <Legend color="balcony" text={`First Floor Chair (${formatMoney(hasDiscountForCategory("chair-balcony", discountAllowance) ? 699 : 899)})`} />
          <Legend color="selected" text="Selected" />
          <Legend color="pending" text="Pending" />
          <Legend color="booked" text="Booked" />
        </div>

        <PriceTable discountAllowance={discountAllowance} />

        <div className={styles.seatMapWrapper}>
          <div className={styles.stageWrap}>
            <div className={`${styles.lantern} ${styles.lanternLeft}`} />
            <div className={`${styles.lantern} ${styles.lanternRight}`} />
            <div className={styles.stage}>MEHFIL</div>
          </div>

          <div className={styles.sectionTitle}>Diwan-e-Khas - Sofa Seating</div>
          <div className={styles.sofaMapScroll}>
            <div className={styles.sofaRows}>
              <div className={styles.sofaSideLabels} aria-hidden="true">
                <div>Left</div>
                <div />
                <div>Right</div>
              </div>
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
                          discountAllowance={discountAllowance}
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
                          discountAllowance={discountAllowance}
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
              <div className={styles.mapFloorLabel} style={{ top: "-32px" }}>
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
                    discountAllowance={discountAllowance}
                    status={PRE_BOOKED_CHAIR_IDS.has(seat.id) ? "booked" : seatStatus[seat.id] || "available"}
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
              {"Review your selection, complete payment, and upload the screenshot for admin verification. 18% GST is included in the total."}
            </p>
            <OrderSummary selectedSeats={selectedSeats} totals={totals} />

            <div className={styles.paymentMethodPicker}>
              <label htmlFor="paymentMethod">Select Payment Method</label>
              <select
                id="paymentMethod"
                className={styles.pmSelect}
                value={paymentMethod}
                onChange={changePaymentMethod}
              >
                <option value="upi">UPI - Scan QR / pay to munjalshah9@okicici</option>
                <option value="imps">IMPS / NEFT - Bank Transfer</option>
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

            </div>

            <div className={styles.paidConfirm}>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
                <span>I have completed the payment</span>
              </label>
            </div>

            {paid && (
              <div className={styles.uploadForm}>
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter phone number"
                  autoComplete="tel"
                  maxLength={20}
                />
                <label>GST Number (Optional)</label>
                <input
                  value={gstNumber}
                  onChange={(event) => setGstNumber(event.target.value.toUpperCase())}
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

        <p className={styles.footerNote}>
          <span>*</span> An unforgettable evening of poetry, stories &amp; music <span>*</span>
          <br />
          © BNI Kutch Chapter · Presented with love
        </p>

        <div className={styles.footerSponsor}>
          <span className={styles.footerSponsorLabel}>Booking Partner</span>
          <img className={styles.footerSponsorLogo} src={krivoxxLogo.src} alt="Booking Partner" />
        </div>
      </div>

      <div className={`${styles.bookingPanel} ${paymentVisible ? styles.bookingPanelHidden : ""}`}>
        <div className={styles.panelInfo}>
          <small>Selected Seats · {selectedSeats.length}</small>
          {selectedSeats.length > 0 && (
            <div className={styles.seatCounts}>
              <span className={`${styles.countPill} ${styles.sofaCount}`}>
                🛋️ Sofa <span className={styles.num}>{totals.sofaCount || 0}</span>
              </span>
              <span className={`${styles.countPill} ${styles.chairCount}`}>
                🎁 Chair <span className={styles.num}>{totals.chairCount || 0}</span>
              </span>
            </div>
          )}
          <div className={styles.selectedTags}>
            {totals.items.map((seat) => (
              <span
                className={`${styles.tag} ${
                  seat.priceLabel === "Discounted" ? styles.tagStd : styles.tagExtra
                }`}
                key={seat.id}
              >
                {seat.id} · {formatMoney(seat.chargedPrice)} {seat.priceLabel === "Discounted" ? "✓" : "+"}
              </span>
            ))}
          </div>
          {totals.bundle && selectedSeats.length > 0 && (
            <div className={styles.bundleHint}>{getBundleHint(totals.bundle, discountAllowance)}</div>
          )}
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

      <AppPopup
        open={Boolean(popup)}
        title={popup?.title}
        message={popup?.message}
        type={popup?.type}
        confirmLabel={popup?.loginRedirect ? "Login" : "OK"}
        onConfirm={() => {
          if (popup?.loginRedirect) {
            window.location.href = "/login";
          }
          setPopup(null);
        }}
      />
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

function PriceCard({ tone, title, sub, discounted, standard, swatchClass, hasDiscount }) {
  return (
    <div className={`${styles.priceCard} ${styles[tone]}`}>
      <div className={styles.accent} />
      <div className={styles.pcTitle}>
        <span className={`${styles.swatch} ${styles[swatchClass]}`} />
        {title}
      </div>
      <div className={styles.pcSub}>{sub}</div>
      {hasDiscount && (
        <div className={styles.priceRow}><span>Discounted</span><strong>{formatMoney(discounted)}</strong></div>
      )}
      <div className={`${styles.priceRow} ${styles.extra}`}><span>Standard</span><strong>{formatMoney(standard)}</strong></div>
    </div>
  );
}

function getBundleHint(bundle, discountAllowance) {
  if (bundle === "sofa") {
    return "Sofa allowance active - 1 Sofa at Discounted. Any extra Sofa, and every Chair, is charged at the Standard rate.";
  }
  const count = discountAllowance.category === "choice" ? 2 : discountAllowance.chairRemaining;
  return `Chair allowance active - up to ${count} Chair${count === 1 ? "" : "s"} at Discounted. Any extra Chair, and every Sofa, is charged at the Standard rate.`;
}

function PriceTable({ discountAllowance }) {
  return (
    <div className={styles.pricingSection}>
      <div className={styles.pricingHeader}>
        <h2>Choose Your Seat in the Mehfil</h2>
        <p>Every seat brings you closer to the story. Prices are per seat, exclusive of 18% GST.</p>
        <div className={styles.sofaCapacityNote}>Each sofa booking admits 2 guests</div>
      </div>
      <div className={styles.priceGrid}>
        <PriceCard hasDiscount={hasDiscountForCategory("platinum", discountAllowance)} tone="platinumCard" title="Sofa - Platinum" sub="Rows 2, 3, 4 · Most premium" discounted={9000} standard={11000} swatchClass="legendplatinum" />
        <PriceCard hasDiscount={hasDiscountForCategory("gold", discountAllowance)} tone="goldCard" title="Sofa - Gold" sub="Rows 5, 6, 7, 8 · Premium" discounted={6000} standard={7500} swatchClass="legendgold" />
        <PriceCard hasDiscount={hasDiscountForCategory("chair-ground", discountAllowance)} tone="groundCard" title="Chair - Ground Floor" sub="Prime chair seating" discounted={999} standard={1199} swatchClass="legendground" />
        <PriceCard hasDiscount={hasDiscountForCategory("chair-balcony", discountAllowance)} tone="balconyCard" title="Chair - First Floor" sub="First-floor chair seating" discounted={699} standard={899} swatchClass="legendbalcony" />
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
