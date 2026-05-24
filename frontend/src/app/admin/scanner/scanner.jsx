"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminToken } from "@/shared/adminAuth";
import { formatMoney } from "@/shared/money";
import styles from "./scanner.module.css";

function extractToken(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const parts = url.pathname.split("/").filter(Boolean);
    const verifyIndex = parts.indexOf("verify");
    return verifyIndex >= 0 ? parts[verifyIndex + 1] || "" : text;
  } catch {
    const parts = text.split("/").filter(Boolean);
    const verifyIndex = parts.indexOf("verify");
    return verifyIndex >= 0 ? parts[verifyIndex + 1] || "" : text;
  }
}

export default function AdminScanner() {
  const router = useRouter();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(0);
  const canvasRef = useRef(null);
  const [supported, setSupported] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [token, setToken] = useState("");
  const [booking, setBooking] = useState(null);
  const [entryCount, setEntryCount] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(scanLoopRef.current);
    clearTimeout(scanLoopRef.current);
    scanLoopRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const loadBooking = useCallback(async (nextToken) => {
    const cleanToken = extractToken(nextToken);
    const adminToken = getAdminToken();

    if (!adminToken) {
      router.push("/admin/login");
      return;
    }
    if (!cleanToken) {
      setError("Scan or paste a valid ticket QR code.");
      return;
    }

    setError("");
    setMessage("");
    setToken(cleanToken);
    stopCamera();

    try {
      const response = await fetch(`/api/verify/${cleanToken}`, {
        headers: { "x-admin-token": adminToken },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to verify booking.");
      setBooking(payload);
      setEntryCount(1);
    } catch (loadError) {
      setBooking(null);
      setError(loadError.message);
    }
  }, [router, stopCamera]);

  const startCamera = useCallback(async () => {
    setError("");
    setMessage("");
    setBooking(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setSupported(false);
        setError("This browser cannot access the camera here. Use HTTPS/localhost or paste the QR link below.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
      setSupported(true);
      setScanning(true);
      setMessage("Camera is active. Hold the QR steady and fill most of the box.");

      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;

        if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !videoRef.current.videoWidth) {
          scanLoopRef.current = setTimeout(scanFrame, 150);
          return;
        }

        try {
          const canvas = canvasRef.current || document.createElement("canvas");
          canvasRef.current = canvas;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          if (detector) {
            const codes = await detector.detect(canvas);
            if (codes.length) {
              await loadBooking(codes[0].rawValue);
              return;
            }
          }

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (code?.data) {
            await loadBooking(code.data);
            return;
          }
        } catch {
          setSupported(false);
          setError("Unable to read QR codes from camera. Paste the QR link below.");
          stopCamera();
          return;
        }

        scanLoopRef.current = setTimeout(scanFrame, 250);
      };

      scanLoopRef.current = setTimeout(scanFrame, 250);
    } catch (cameraError) {
      setError(cameraError.message || "Unable to open camera.");
      stopCamera();
    }
  }, [loadBooking, stopCamera]);

  async function confirmEntry() {
    const adminToken = getAdminToken();
    if (!adminToken) {
      router.push("/admin/login");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

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
      setMessage(`${entryCount} ${entryCount === 1 ? "ticket" : "tickets"} checked in.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function scanAgain() {
    setBooking(null);
    setToken("");
    setManualValue("");
    setMessage("");
    setError("");
    startCamera();
  }

  useEffect(() => {
    if (!getAdminToken()) {
      router.push("/admin/login");
    }

    return stopCamera;
  }, [router, stopCamera]);

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.header}>
          <div>
            <span>Admin Entry</span>
            <h1>QR Scanner</h1>
          </div>
          <Link href="/admin">Dashboard</Link>
        </div>

        {!booking ? (
          <>
            <div className={styles.cameraBox}>
              <video ref={videoRef} className={styles.video} muted playsInline />
              {!scanning ? <p>{supported ? "Start the camera and point it at the ticket QR." : "Paste the QR link below."}</p> : null}
            </div>

            <button className={styles.primaryButton} type="button" onClick={startCamera} disabled={scanning}>
              {scanning ? "Scanning..." : "Start Scanner"}
            </button>
            <p className={styles.helpText}>Camera permission appears only after tapping Start Scanner, and only on HTTPS or localhost.</p>

            <form
              className={styles.manualForm}
              onSubmit={(event) => {
                event.preventDefault();
                loadBooking(manualValue);
              }}
            >
              <label htmlFor="manualQr">Paste QR link or token</label>
              <input
                id="manualQr"
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                placeholder="https://.../verify/token"
              />
              <button type="submit">Open Ticket</button>
            </form>
          </>
        ) : (
          <div className={styles.ticket}>
            <div className={getTicketStatusClass(booking)}>
              {getTicketStatusText(booking)}
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
                <dt>{getPaymentAmountLabel(booking)}</dt>
                <dd>{formatMoney(booking.total)}</dd>
              </div>
            </dl>

            {booking.status !== "confirmed" ? (
              <p className={styles.blockedText}>
                {booking.status === "pending"
                  ? getPendingEntryMessage(booking)
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
                <button className={styles.primaryButton} type="button" onClick={confirmEntry} disabled={saving}>
                  {saving ? "Saving..." : `Confirm ${entryCount} ${entryCount === 1 ? "ticket" : "tickets"}`}
                </button>
              </div>
            ) : (
              <p className={styles.doneText}>All guests for this booking have already entered.</p>
            )}

            <button className={styles.secondaryButton} type="button" onClick={scanAgain}>
              Scan Again
            </button>
          </div>
        )}

        {message ? <p className={styles.message}>{message}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}

function getTicketStatusClass(booking) {
  if (booking.status === "pending") return styles.pending;
  if (booking.status === "rejected") return styles.rejected;
  return booking.remainingCount > 0 ? styles.valid : styles.complete;
}

function getTicketStatusText(booking) {
  if (booking.status === "pending") return isCashBooking(booking) ? "Cash payment pending" : "Pending payment verification";
  if (booking.status === "rejected") return "Rejected ticket";
  return `${booking.checkedInCount} of ${booking.totalGuests} tickets checked in`;
}

function getPaymentAmountLabel(booking) {
  return isCashBooking(booking) && booking.status !== "confirmed" ? "Amount Due" : "Total Paid";
}

function getPendingEntryMessage(booking) {
  if (isCashBooking(booking)) {
    return "Cash payment is pending. Confirm this booking from the dashboard after payment is received.";
  }

  return "Payment is not verified yet. Confirm this booking from the dashboard before allowing entry.";
}

function isCashBooking(booking) {
  return booking.paymentMethod === "cash";
}
