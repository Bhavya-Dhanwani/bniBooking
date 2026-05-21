const GST_RATE = 0.18;

const sofaRows = {
  S1: 9000,
  S2: 9000,
  S3: 9000,
  S4: 9000,
  S5: 6000,
  S6: 6000,
  S7: 6000,
  S8: 6000,
};

function getSeatPrice(seatId) {
  if (seatId.startsWith("G-")) return 999;
  if (seatId.startsWith("B-")) return 699;

  const sofaRow = seatId.split("-")[0];
  if (sofaRows[sofaRow]) return sofaRows[sofaRow];

  return 0;
}

export function isSofaSeat(seatId) {
  return /^S[1-8]-/.test(seatId);
}

export function calculateTotals(seats) {
  const baseAmount = seats.reduce((sum, seatId) => sum + getSeatPrice(seatId), 0);
  const gst = Math.round(baseAmount * GST_RATE);
  return {
    baseAmount,
    gst,
    total: baseAmount + gst,
  };
}

export function validateSeatCaps(seats) {
  const sofaCount = seats.filter(isSofaSeat).length;
  const chairCount = seats.length - sofaCount;

  if (sofaCount > 1) return "You can only book 1 Sofa seat per booking.";
  if (chairCount > 2) return "You can only book 2 Chair seats per booking.";
  return null;
}
