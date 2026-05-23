import { GST_RATE } from "./seatMap";

export function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function calculateTotals(selectedSeats) {
  const firstSeat = selectedSeats.find((seat) => isSofaSeat(seat) || isChairSeat(seat));
  const firstType = firstSeat ? (isSofaSeat(firstSeat) ? "sofa" : "chair") : null;
  let sofaDiscountedLeft = firstType === "sofa" ? 1 : 0;
  let chairDiscountedLeft = firstType === "chair" ? 2 : 0;

  let sofaCount = 0;
  let chairCount = 0;
  const items = selectedSeats.map((seat) => {
    const isSofa = isSofaSeat(seat);
    const isChair = isChairSeat(seat);
    const standardPrice = seat.price;
    const extraPrice = seat.extraPrice || seat.price;
    let chargedPrice = extraPrice;
    let priceLabel = "Standard";

    if (isSofa) {
      sofaCount += 1;
      if (sofaDiscountedLeft > 0) {
        chargedPrice = standardPrice;
        priceLabel = "Discounted";
        sofaDiscountedLeft -= 1;
      }
    } else if (isChair) {
      chairCount += 1;
      if (chairDiscountedLeft > 0) {
        chargedPrice = standardPrice;
        priceLabel = "Discounted";
        chairDiscountedLeft -= 1;
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
    bundle: firstType,
    sofaCount,
    chairCount,
  };
}

function isSofaSeat(seat) {
  return seat?.cat === "platinum" || seat?.cat === "gold";
}

function isChairSeat(seat) {
  return (
    seat?.cat === "chair-ground" ||
    seat?.cat === "chair-balcony" ||
    seat?.cat === "chairGround" ||
    seat?.cat === "chairBalcony"
  );
}
