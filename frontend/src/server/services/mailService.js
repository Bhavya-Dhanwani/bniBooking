import nodemailer from "nodemailer";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP settings are not configured.");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatPdfMoney(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeBooking(booking) {
  return typeof booking.toObject === "function" ? booking.toObject() : booking;
}

function getBookingId(booking) {
  return booking.bookingId || booking.id;
}

function getCheckInUrl(booking, baseUrl) {
  const cleanBaseUrl = String(baseUrl || "").replace(/\/$/, "");
  return `${cleanBaseUrl}/verify/${booking.checkInToken}`;
}

function bookingDetailsHtml(sourceBooking, statusLabel, message) {
  const booking = normalizeBooking(sourceBooking);
  const createdAt = booking.createdAt || booking.date || new Date();

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#333;">
      <h2 style="color:#002244;margin:0 0 8px;">BNI Kutch Event Booking</h2>
      <p style="margin:0 0 18px;">${escapeHtml(message)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;">
        <tbody>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Status</td><td style="padding:8px;border:1px solid #eee;">${escapeHtml(statusLabel)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Booking ID</td><td style="padding:8px;border:1px solid #eee;">${escapeHtml(getBookingId(booking))}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Name</td><td style="padding:8px;border:1px solid #eee;">${escapeHtml(booking.name)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Email</td><td style="padding:8px;border:1px solid #eee;">${escapeHtml(booking.email)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Phone</td><td style="padding:8px;border:1px solid #eee;">${escapeHtml(booking.phone)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">GST No.</td><td style="padding:8px;border:1px solid #eee;">${escapeHtml(booking.gstNumber || "-")}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Seats</td><td style="padding:8px;border:1px solid #eee;">${escapeHtml(booking.seats.join(", "))}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Base Amount</td><td style="padding:8px;border:1px solid #eee;">${formatMoney(booking.baseAmount)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">GST</td><td style="padding:8px;border:1px solid #eee;">${formatMoney(booking.gst)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Total Paid</td><td style="padding:8px;border:1px solid #eee;font-weight:700;color:#e31837;">${formatMoney(booking.total)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Payment Screenshot</td><td style="padding:8px;border:1px solid #eee;"><a href="${escapeHtml(booking.screenshot)}">View screenshot</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Date</td><td style="padding:8px;border:1px solid #eee;">${new Date(createdAt).toLocaleString("en-IN")}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function bookingDetailsText(sourceBooking, statusLabel, message) {
  const booking = normalizeBooking(sourceBooking);
  const createdAt = booking.createdAt || booking.date || new Date();

  return [
    "BNI Kutch Event Booking",
    "",
    message,
    "",
    `Status: ${statusLabel}`,
    `Booking ID: ${getBookingId(booking)}`,
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
    `GST No.: ${booking.gstNumber || "-"}`,
    `Seats: ${booking.seats.join(", ")}`,
    `Base Amount: ${formatMoney(booking.baseAmount)}`,
    `GST: ${formatMoney(booking.gst)}`,
    `Total Paid: ${formatMoney(booking.total)}`,
    `Payment Screenshot: ${booking.screenshot}`,
    `Date: ${new Date(createdAt).toLocaleString("en-IN")}`,
  ].join("\n");
}

function drawWrappedText(page, text, options) {
  const { x, y, maxWidth, font, size, color, lineHeight } = options;
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  });
}

async function createPdfBuffer(sourceBooking, qrImageDataUrl, checkInUrl) {
  const booking = normalizeBooking(sourceBooking);
  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([595.28, 841.89]);
  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const qrBuffer = Buffer.from(qrImageDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDocument.embedPng(qrBuffer);
  const darkBlue = rgb(0, 0.13, 0.27);
  const red = rgb(0.89, 0.09, 0.22);
  const muted = rgb(0.38, 0.43, 0.5);

  page.drawText("BNI Kutch Event Booking", {
    x: 143,
    y: 780,
    size: 22,
    font: boldFont,
    color: darkBlue,
  });
  page.drawText("Confirmed Ticket", {
    x: 235,
    y: 750,
    size: 13,
    font: regularFont,
    color: rgb(0.07, 0.07, 0.07),
  });

  const details = [
    ["Booking ID", getBookingId(booking)],
    ["Name", booking.name],
    ["Email", booking.email],
    ["Phone", booking.phone],
    ["GST No.", booking.gstNumber || "-"],
    ["Seats", booking.seats.join(", ")],
    ["Base Amount", formatPdfMoney(booking.baseAmount)],
    ["GST", formatPdfMoney(booking.gst)],
    ["Total Paid", formatPdfMoney(booking.total)],
    ["Booking Date", new Date(booking.createdAt || booking.date || Date.now()).toLocaleString("en-IN")],
  ];

  let y = 700;
  details.forEach(([label, value]) => {
    page.drawText(label.toUpperCase(), {
      x: 70,
      y,
      size: 9,
      font: boldFont,
      color: muted,
    });
    drawWrappedText(page, value, {
      x: 205,
      y,
      maxWidth: 320,
      size: 12,
      font: regularFont,
      color: rgb(0.07, 0.07, 0.07),
      lineHeight: 14,
    });
    y -= 32;
  });

  page.drawText("Scan to verify and confirm entry", {
    x: 70,
    y: 360,
    size: 13,
    font: boldFont,
    color: darkBlue,
  });
  page.drawImage(qrImage, {
    x: 70,
    y: 185,
    width: 150,
    height: 150,
  });
  drawWrappedText(page, checkInUrl, {
    x: 70,
    y: 160,
    maxWidth: 455,
    size: 9,
    font: regularFont,
    color: muted,
    lineHeight: 12,
  });
  page.drawText("Please carry this ticket for entry verification.", {
    x: 70,
    y: 95,
    size: 11,
    font: boldFont,
    color: red,
  });

  const bytes = await pdfDocument.save();
  return Buffer.from(bytes);
}

async function sendBookingEmail(booking, statusLabel, subject, message, options = {}) {
  const attachments = options.attachments || [];

  await getTransporter().sendMail({
    from: (process.env.MAIL_FROM || process.env.SMTP_USER || "").trim(),
    to: booking.email,
    subject,
    text: bookingDetailsText(booking, statusLabel, message),
    html: bookingDetailsHtml(booking, statusLabel, message),
    attachments,
  });
}

export async function sendPendingBookingEmail(booking) {
  await sendBookingEmail(
    booking,
    "Pending Verification",
    `BNI booking received - ${getBookingId(booking)}`,
    "Your booking has been received and is currently pending payment verification.",
  );
}

export async function sendConfirmedBookingEmail(booking, baseUrl) {
  const normalizedBooking = normalizeBooking(booking);
  const checkInUrl = getCheckInUrl(normalizedBooking, baseUrl);
  const qrImageDataUrl = await QRCode.toDataURL(checkInUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
  const pdfBuffer = await createPdfBuffer(normalizedBooking, qrImageDataUrl, checkInUrl);

  await sendBookingEmail(
    booking,
    "Confirmed",
    `BNI booking confirmed - ${getBookingId(normalizedBooking)}`,
    "Your payment has been verified by the admin. Your booking is now confirmed. Your confirmed ticket PDF is attached.",
    {
      attachments: [
        {
          filename: `${getBookingId(normalizedBooking)}-ticket.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    },
  );
}

export async function sendRejectedBookingEmail(booking) {
  await sendBookingEmail(
    booking,
    "Rejected",
    `BNI booking rejected - ${getBookingId(booking)}`,
    "Your payment verification was rejected by the admin. Please contact the event team if you believe this is a mistake.",
  );
}

export async function sendMailSafely(taskName, sendMail) {
  try {
    await sendMail();
  } catch (error) {
    console.error(`${taskName} failed:`, error.message);
  }
}
