import { GST_RATE } from "./seatMap";

export function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function calculateTotals(selectedSeats) {
  let sofaCount = 0;
  let chairCount = 0;
  const items = selectedSeats.map((seat) => {
    const isSofa = seat.cat === "platinum" || seat.cat === "gold";
    const standardPrice = seat.price;
    const extraPrice = seat.extraPrice || seat.price;
    let chargedPrice = standardPrice;
    let priceLabel = "Standard";

    if (isSofa) {
      sofaCount += 1;
      if (sofaCount > 1) {
        chargedPrice = extraPrice;
        priceLabel = "Additional";
      }
    } else {
      chairCount += 1;
      if (chairCount > 2) {
        chargedPrice = extraPrice;
        priceLabel = "Additional";
      }
    }

    return { ...seat, standardPrice, extraPrice, chargedPrice, priceLabel };
  });

  const base = items.reduce((sum, seat) => sum + seat.chargedPrice, 0);
  const gst = Math.round(base * GST_RATE);
  return {
    items,
    base,
    gst,
    total: base + gst,
  };
}
