import { GST_RATE, getSeatById, isSofaCategory } from "@/shared/seatMap";

export function isSofaSeat(seatId) {
  return /^S[1-8]-/.test(seatId);
}

export function calculateTotals(seats, discountAllowance) {
  const seatDetails = seats.map((seatId) => ({ seatId, seat: getSeatById(seatId) }));
  const allowanceCategory = discountAllowance?.category || "none";
  const firstSeat = allowanceCategory === "choice"
    ? seatDetails.find(({ seat }) => seat && (isSofaCategory(seat.cat) || isChairCategory(seat.cat)))
    : null;
  const firstType = firstSeat ? (isSofaCategory(firstSeat.seat.cat) ? "sofa" : "chair") : null;
  const activeCategory = allowanceCategory === "choice" ? firstType : allowanceCategory;
  let sofaDiscountedLeft = activeCategory === "sofa" ? (discountAllowance?.sofaRemaining || 0) : 0;
  let chairDiscountedLeft = activeCategory === "chair" ? (discountAllowance?.chairRemaining || 0) : 0;

  let sofaCount = 0;
  let chairCount = 0;
  const priceBreakup = seatDetails.map(({ seatId, seat }) => {
    if (!seat) {
      return { id: seatId, price: 0, priceType: "Unknown" };
    }

    const isSofa = isSofaCategory(seat.cat);
    const isChair = isChairCategory(seat.cat);
    let chargedPrice = seat.extraPrice || seat.price;
    let priceLabel = "Standard";

    if (isSofa) {
      sofaCount += 1;
      if (sofaDiscountedLeft > 0) {
        chargedPrice = seat.price;
        priceLabel = "Discounted";
        sofaDiscountedLeft -= 1;
      }
    } else if (isChair) {
      chairCount += 1;
      if (chairDiscountedLeft > 0) {
        chargedPrice = seat.price;
        priceLabel = "Discounted";
        chairDiscountedLeft -= 1;
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
    bundle: activeCategory === "none" ? null : activeCategory,
    sofaCount,
    chairCount,
  };
}

function isChairCategory(cat) {
  return cat === "chair-ground" || cat === "chair-balcony" || cat === "chairGround" || cat === "chairBalcony";
}

export function validateSeatCaps(seats) {
  return null;
}
