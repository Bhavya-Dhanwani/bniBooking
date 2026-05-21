export const GST_RATE = 0.18;

export const sofaRows = [
  { id: "S1", label: "Row 1", left: 5, right: 5, price: 9000, cat: "platinum" },
  { id: "S2", label: "Row 2", left: 5, right: 5, price: 9000, cat: "platinum" },
  { id: "S3", label: "Row 3", left: 7, right: 7, price: 9000, cat: "platinum" },
  { id: "S4", label: "Row 4", left: 7, right: 7, price: 9000, cat: "platinum" },
  { id: "S5", label: "Row 5", left: 7, right: 7, price: 6000, cat: "gold" },
  { id: "S6", label: "Row 6", left: 7, right: 7, price: 6000, cat: "gold" },
  { id: "S7", label: "Row 7", left: 5, right: 5, price: 6000, cat: "gold" },
  { id: "S8", label: "Row 8", left: 5, right: 5, price: 6000, cat: "gold" },
];

export const groundRows = [
  { id: "A", left: 23, right: 23, price: 999, cat: "chairGround", offsetLeft: 0 },
  { id: "B", left: 23, right: 23, price: 999, cat: "chairGround", offsetLeft: 0 },
  { id: "C", left: 23, right: 23, price: 999, cat: "chairGround", offsetLeft: 0 },
  { id: "D", left: 22, right: 22, price: 999, cat: "chairGround", offsetLeft: 1 },
  { id: "E", left: 22, right: 22, price: 999, cat: "chairGround", offsetLeft: 1 },
  { id: "F", left: 22, right: 20, price: 999, cat: "chairGround", offsetLeft: 1 },
  { id: "G", left: 13, right: 13, price: 999, cat: "chairGround", offsetLeft: 8 },
  { id: "H", left: 11, right: 11, price: 999, cat: "chairGround", offsetLeft: 10 },
  { id: "I", left: 9, right: 9, price: 999, cat: "chairGround", offsetLeft: 12 },
  { id: "J", left: 7, right: 7, price: 999, cat: "chairGround", offsetLeft: 14 },
  { id: "K", left: 6, right: 6, price: 999, cat: "chairGround", offsetLeft: 15 },
];

export const balconyRows = [
  { id: "F1", label: "Row 1", left: 15, right: 15, price: 699, cat: "chairBalcony" },
  { id: "F2", label: "Row 2", left: 14, right: 14, price: 699, cat: "chairBalcony" },
  { id: "F3", label: "Row 3", left: 13, right: 13, price: 699, cat: "chairBalcony" },
  { id: "F4", label: "Row 4", left: 9, right: 9, price: 699, cat: "chairBalcony" },
  { id: "F5", label: "Row 5", left: 9, right: 9, price: 699, cat: "chairBalcony" },
  { id: "F6", label: "Row 6", left: 8, right: 8, price: 699, cat: "chairBalcony" },
];

export function getSeatCategory(cat) {
  if (cat === "platinum") return "Sofa Platinum";
  if (cat === "gold") return "Sofa Gold";
  if (cat === "chairGround") return "Ground Chair";
  if (cat === "chairBalcony") return "Balcony Chair";
  return "Seat";
}

export function isSofaCategory(cat) {
  return cat === "platinum" || cat === "gold";
}
