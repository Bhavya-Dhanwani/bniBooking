"use client";

import styles from "./appPopup.module.css";

export default function AppPopup({
  open,
  title,
  message,
  type = "info",
  confirmLabel = "OK",
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation">
      <section className={`${styles.popup} ${styles[type] || ""}`} role="dialog" aria-modal="true" aria-labelledby="popup-title">
        <div className={styles.icon}>{type === "danger" ? "!" : type === "success" ? "✓" : "i"}</div>
        <h2 id="popup-title">{title}</h2>
        <p>{message}</p>
        <div className={styles.actions}>
          {cancelLabel && (
            <button className={styles.cancel} type="button" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button className={styles.confirm} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
