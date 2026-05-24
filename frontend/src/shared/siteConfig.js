export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const siteName = "BNI Kutch Event Booking";
export const siteDescription =
  "Book seats online for the BNI Kutch Laksh Maheshwari event with GST-inclusive pricing, payment upload, and confirmed ticket QR verification.";

export function absoluteUrl(path = "/") {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
