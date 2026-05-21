import { GST_RATE } from "./seatMap";

export function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function calculateTotals(selectedSeats) {
  const base = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const gst = Math.round(base * GST_RATE);
  return {
    base,
    gst,
    total: base + gst,
  };
}
