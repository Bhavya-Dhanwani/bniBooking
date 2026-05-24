import styles from "@/features/booking/booking.module.css";
import SiteCountdown from "@/shared/SiteCountdown";

export default function SiteUnavailable() {
  return (
    <main className={`${styles.page} ${styles.unavailablePage}`}>
      <div className={styles.unavailableGlow} aria-hidden="true" />
      <section className={styles.unavailablePanel}>
        <div className={styles.unavailableLogoWrap}>
          <img src="/bni-logo.jpg" alt="BNI Kutch" className={styles.unavailableLogo} />
        </div>
        <h1>Bookings Will Open Soon</h1>
        <p>Seat bookings are being prepared. Please check back shortly.</p>
        <SiteCountdown />
      </section>
    </main>
  );
}
