import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const amount = Number(searchParams.get("amount") || 0);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : "0.00";
  const upiUri = `upi://pay?pa=munjalshah9%40okicici&pn=Imperial%20Innoventures&am=${safeAmount}&cu=INR`;

  const png = await QRCode.toBuffer(upiUri, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 420,
    color: { dark: "#002244", light: "#FFFFFF" },
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
