import { GST_RATE } from "./seatMap";

export const NO_DISCOUNT_ALLOWANCE = { category: "none", sofaRemaining: 0, chairRemaining: 0 };

export function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function hasDiscountForCategory(cat, discountAllowance) {
  if (discountAllowance?.category === "choice") return true;
  if (discountAllowance?.category === "sofa") return isSofaCategory(cat) && discountAllowance.sofaRemaining > 0;
  return discountAllowance?.category === "chair" && isChairCategory(cat) && discountAllowance.chairRemaining > 0;
}

export function calculateTotals(selectedSeats, discountAllowance = NO_DISCOUNT_ALLOWANCE) {
  const allowanceCategory = discountAllowance?.category || "none";
  const firstSeat =
    allowanceCategory === "choice" && selectedSeats.find((seat) => isSofaSeat(seat) || isChairSeat(seat));
  const firstType = firstSeat ? (isSofaSeat(firstSeat) ? "sofa" : "chair") : null;
  const activeCategory = allowanceCategory === "choice" ? firstType : allowanceCategory;
  let sofaDiscountedLeft = activeCategory === "sofa" ? (discountAllowance?.sofaRemaining || 0) : 0;
  let chairDiscountedLeft = activeCategory === "chair" ? (discountAllowance?.chairRemaining || 0) : 0;

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
    bundle: activeCategory === "none" ? null : activeCategory,
    sofaCount,
    chairCount,
  };
}

function isSofaSeat(seat) {
  return isSofaCategory(seat?.cat);
}

function isChairSeat(seat) {
  return isChairCategory(seat?.cat);
}

function isSofaCategory(cat) {
  return cat === "platinum" || cat === "gold";
}

function isChairCategory(cat) {
  return cat === "chair-ground" || cat === "chair-balcony" || cat === "chairGround" || cat === "chairBalcony";
}
