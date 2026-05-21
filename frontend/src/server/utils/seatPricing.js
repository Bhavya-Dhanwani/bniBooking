import { GST_RATE, getSeatById, isSofaCategory } from "@/shared/seatMap";

export function isSofaSeat(seatId) {
  return /^S[1-8]-/.test(seatId);
}

export function calculateTotals(seats) {
  let sofaCount = 0;
  let chairCount = 0;
  const priceBreakup = seats.map((seatId) => {
    const seat = getSeatById(seatId);
    if (!seat) {
      return { id: seatId, price: 0, priceType: "Unknown" };
    }

    const isSofa = isSofaCategory(seat.cat);
    let chargedPrice = seat.price;
    let priceLabel = "Standard";

    if (isSofa) {
      sofaCount += 1;
      if (sofaCount > 1) {
        chargedPrice = seat.extraPrice || seat.price;
        priceLabel = "Additional";
      }
    } else {
      chairCount += 1;
      if (chairCount > 2) {
        chargedPrice = seat.extraPrice || seat.price;
        priceLabel = "Additional";
      }
    }

    return { id: seatId, price: chargedPrice, priceType: priceLabel };
  });

  const baseAmount = priceBreakup.reduce((sum, seat) => sum + seat.price, 0);
  const gst = Math.round(baseAmount * GST_RATE);

  return {
    priceBreakup,
    baseAmount,
    gst,
    total: baseAmount + gst,
  };
}

export function validateSeatCaps(seats) {
  return null;
}
