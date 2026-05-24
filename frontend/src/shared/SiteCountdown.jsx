"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/features/booking/booking.module.css";

const TARGET_TIME = new Date("2026-05-25T10:00:00+05:30").getTime();

export default function SiteCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const parts = useMemo(() => getCountdownParts(TARGET_TIME - now), [now]);

  if (parts.expired) {
    return <p className={styles.countdownReady}>Bookings are opening shortly.</p>;
  }

  return (
    <div className={styles.countdown} aria-label="Countdown until bookings open">
      <CountdownPart label="Hours" value={parts.hours} />
      <CountdownPart label="Minutes" value={parts.minutes} />
      <CountdownPart label="Seconds" value={parts.seconds} />
    </div>
  );
}

function CountdownPart({ label, value }) {
  return (
    <div className={styles.countdownPart}>
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}

function getCountdownParts(distance) {
  if (distance <= 0) return { expired: true, hours: 0, minutes: 0, seconds: 0 };

  const totalSeconds = Math.floor(distance / 1000);
  return {
    expired: false,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
