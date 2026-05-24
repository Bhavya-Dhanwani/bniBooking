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

function isCashPendingBooking(booking) {
  return booking.paymentMethod === "cash" && booking.status !== "confirmed";
}

function getPaymentAmountLabel(booking) {
  return isCashPendingBooking(booking) ? "Amount Due" : "Total Paid";
}

function getPaymentMethodLabel(booking) {
  const method = String(booking.paymentMethod || "upi").toLowerCase();
  if (method === "cash") return "Cash at BNI Kutch Regional Office";
  if (method === "imps") return "IMPS / NEFT Bank Transfer";
  return "UPI";
}

function getBookingModeLabel(booking) {
  return booking.paymentMethod === "cash" ? "Cash Booking" : "Online Payment Booking";
}

function detailRow(label, value, options = {}) {
  const valueStyle = options.strong ? "font-weight:800;color:#6b0f1a;" : "color:#2a1810;";

  return `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #f0dfbd;color:#8b7029;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;">${escapeHtml(label)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #f0dfbd;${valueStyle}">${value}</td>
    </tr>`;
}

function bookingDetailsHtml(sourceBooking, statusLabel, message) {
  const booking = normalizeBooking(sourceBooking);
  const createdAt = booking.createdAt || booking.date || new Date();
  const statusColor = statusLabel === "Confirmed" ? "#0f7a3f" : statusLabel === "Rejected" ? "#9d1024" : "#8b7029";
  const screenshotBlock = booking.screenshot
    ? `<a href="${escapeHtml(booking.screenshot)}" style="display:inline-block;color:#6b0f1a;font-weight:800;text-decoration:none;">View payment screenshot</a>`
    : "Cash payment at venue";

  return `
    <div style="margin:0;padding:0;background:#f6edd8;font-family:Arial,sans-serif;color:#2a1810;">
      <div style="max-width:680px;margin:0 auto;padding:28px 14px;">
        <div style="overflow:hidden;border-radius:18px;background:#fffaf0;border:1px solid #e6c77a;box-shadow:0 18px 44px rgba(107,15,26,.14);">
          <div style="padding:28px;background:linear-gradient(135deg,#102033,#6b0f1a 72%,#8f1724);color:#fff8e7;">
            <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#e6c77a;">BNI Kutch Event Booking</div>
            <h1 style="margin:8px 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.18;color:#fff8e7;">Laksh Maheshwari Live</h1>
            <p style="margin:0;color:#f7dfaa;font-size:14px;line-height:1.55;">${escapeHtml(message)}</p>
          </div>

          <div style="padding:20px 24px 6px;">
            <div style="display:inline-block;padding:8px 13px;border-radius:999px;background:${statusColor};color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;">${escapeHtml(statusLabel)}</div>
            <div style="display:inline-block;margin-left:8px;padding:8px 13px;border-radius:999px;background:#f8efd7;color:#6b0f1a;border:1px solid #e6c77a;font-size:12px;font-weight:800;">${escapeHtml(getBookingModeLabel(booking))}</div>
          </div>

          <div style="padding:14px 24px 4px;">
            <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid #f0dfbd;border-radius:12px;overflow:hidden;">
              <tbody>
                ${detailRow("Booking ID", escapeHtml(getBookingId(booking)), { strong: true })}
                ${detailRow("Name", escapeHtml(booking.name))}
                ${detailRow("Email", escapeHtml(booking.email))}
                ${detailRow("Phone", escapeHtml(booking.phone || "-"))}
                ${detailRow("GST No.", escapeHtml(booking.gstNumber || "-"))}
                ${detailRow("Seats", escapeHtml(booking.seats.join(", ")), { strong: true })}
                ${detailRow("Booking Mode", escapeHtml(getBookingModeLabel(booking)))}
                ${detailRow("Payment Mode", escapeHtml(getPaymentMethodLabel(booking)))}
                ${detailRow("Payment Proof", screenshotBlock)}
                ${detailRow("Date", escapeHtml(new Date(createdAt).toLocaleString("en-IN")))}
              </tbody>
            </table>
          </div>

          <div style="padding:14px 24px 24px;">
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#fff8e7;border-radius:12px;overflow:hidden;border:1px solid #e6c77a;">
              <tbody>
                <tr>
                  <td style="padding:12px 14px;color:#6b4c3a;font-weight:700;">Base Amount</td>
                  <td style="padding:12px 14px;text-align:right;font-weight:800;">${formatMoney(booking.baseAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;color:#6b4c3a;font-weight:700;border-top:1px solid #f0dfbd;">GST</td>
                  <td style="padding:12px 14px;text-align:right;font-weight:800;border-top:1px solid #f0dfbd;">${formatMoney(booking.gst)}</td>
                </tr>
                <tr>
                  <td style="padding:15px 14px;background:#6b0f1a;color:#fff8e7;font-size:15px;font-weight:900;">${escapeHtml(getPaymentAmountLabel(booking))}</td>
                  <td style="padding:15px 14px;background:#6b0f1a;color:#e6c77a;text-align:right;font-size:20px;font-weight:900;">${formatMoney(booking.total)}</td>
                </tr>
              </tbody>
            </table>
            <p style="margin:16px 0 0;color:#7a5a3a;font-size:12px;line-height:1.55;">For help, please contact the BNI Kutch event team. Please keep this email for your records.</p>
          </div>
        </div>
      </div>
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
    `${getPaymentAmountLabel(booking)}: ${formatMoney(booking.total)}`,
    booking.screenshot ? `Payment Screenshot: ${booking.screenshot}` : "Payment Method: Cash payment at venue",
    `Date: ${new Date(createdAt).toLocaleString("en-IN")}`,
  ].join("\n");
}

function drawWrappedText(page, text, options) {
  const { x, y, maxWidth, font, size, color, lineHeight } = options;
  const lines = getWrappedLines(text, font, size, maxWidth);

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

function getWrappedLines(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
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
  return lines.length ? lines : [""];
}

function getSeatSummary(booking) {
  const seats = Array.isArray(booking.seats) ? booking.seats : [];
  const preview = seats.slice(0, 6).join(", ");
  if (seats.length <= 6) return preview || "-";
  return `${seats.length} seats (${preview}, +${seats.length - 6} more)`;
}

function drawSeatList(page, seats, options) {
  const { x, y, width, regularFont, boldFont, border, maroon, ink, muted } = options;
  const seatList = Array.isArray(seats) ? seats : [];
  const columnCount = seatList.length > 24 ? 4 : seatList.length > 12 ? 3 : 2;
  const columnWidth = width / columnCount;
  const lineHeight = 13;
  const rowsPerColumn = Math.ceil(seatList.length / columnCount);
  const panelHeight = Math.min(142, Math.max(42, rowsPerColumn * lineHeight + 28));

  page.drawText(`Seat List (${seatList.length})`, {
    x,
    y,
    size: 12,
    font: boldFont,
    color: maroon,
  });
  page.drawRectangle({
    x,
    y: y - panelHeight - 8,
    width,
    height: panelHeight,
    color: rgb(1, 1, 1),
    borderColor: border,
    borderWidth: 0.7,
  });

  if (!seatList.length) {
    page.drawText("-", { x: x + 12, y: y - 30, size: 9, font: regularFont, color: muted });
    return y - panelHeight - 18;
  }

  seatList.forEach((seat, index) => {
    const column = Math.floor(index / rowsPerColumn);
    const row = index % rowsPerColumn;
    const seatX = x + 12 + column * columnWidth;
    const seatY = y - 31 - row * lineHeight;

    if (seatY < y - panelHeight + 6) return;
    page.drawText(String(seat), {
      x: seatX,
      y: seatY,
      size: 8.5,
      font: regularFont,
      color: ink,
    });
  });

  return y - panelHeight - 18;
}

function drawSeatListSummary(page, seats, options) {
  const { x, y, width, regularFont, boldFont, border, maroon, muted } = options;
  const seatList = Array.isArray(seats) ? seats : [];

  page.drawText(`Seat List (${seatList.length})`, {
    x,
    y,
    size: 12,
    font: boldFont,
    color: maroon,
  });
  page.drawRectangle({
    x,
    y: y - 50,
    width,
    height: 38,
    color: rgb(1, 1, 1),
    borderColor: border,
    borderWidth: 0.7,
  });
  page.drawText("Full seat list continues on the next page.", {
    x: x + 12,
    y: y - 34,
    size: 9,
    font: regularFont,
    color: muted,
  });

  return y - 62;
}

function drawSeatListPage(pdfDocument, seats, options) {
  const { regularFont, boldFont, border, maroon, gold, cream, ink, muted } = options;
  const seatList = Array.isArray(seats) ? seats : [];
  const seatsPerPage = 120;

  for (let pageIndex = 0; pageIndex * seatsPerPage < seatList.length; pageIndex += 1) {
    const pageSeats = seatList.slice(pageIndex * seatsPerPage, (pageIndex + 1) * seatsPerPage);
    const page = pdfDocument.addPage([595.28, 841.89]);
    page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: rgb(0.98, 0.94, 0.84) });
    page.drawRectangle({ x: 38, y: 48, width: 519.28, height: 745, color: cream, borderColor: border, borderWidth: 1.2 });
    page.drawRectangle({ x: 38, y: 720, width: 519.28, height: 73, color: maroon });
    page.drawRectangle({ x: 38, y: 720, width: 519.28, height: 8, color: gold });
    page.drawText("BNI Kutch Event Booking", {
      x: 66,
      y: 764,
      size: 17,
      font: boldFont,
      color: cream,
    });
    page.drawText(`Seat List (${seatList.length} seats)`, {
      x: 66,
      y: 740,
      size: 12,
      font: regularFont,
      color: gold,
    });

    const columnCount = 5;
    const rowsPerColumn = 24;
    const columnWidth = 96;
    pageSeats.forEach((seat, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      const x = 66 + column * columnWidth;
      const y = 690 - row * 24;
      page.drawRectangle({
        x,
        y: y - 10,
        width: 78,
        height: 18,
        color: row % 2 ? rgb(1, 0.98, 0.93) : rgb(1, 1, 1),
        borderColor: rgb(0.94, 0.88, 0.75),
        borderWidth: 0.4,
      });
      page.drawText(String(seat), {
        x: x + 8,
        y: y - 4,
        size: 8.6,
        font: regularFont,
        color: ink,
      });
    });

    page.drawText("Booking partner KRIVO", {
      x: 395,
      y: 78,
      size: 7.5,
      font: regularFont,
      color: muted,
    });
    page.drawText("XX", {
      x: 481,
      y: 78,
      size: 7.5,
      font: boldFont,
      color: rgb(0.45, 0.18, 0.82),
    });
  }
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
  const gold = rgb(0.9, 0.78, 0.48);
  const cream = rgb(1, 0.97, 0.9);
  const maroon = rgb(0.42, 0.06, 0.1);
  const border = rgb(0.87, 0.76, 0.52);
  const ink = rgb(0.16, 0.09, 0.06);
  const purple = rgb(0.45, 0.18, 0.82);
  const bookingDate = new Date(booking.createdAt || booking.date || Date.now()).toLocaleString("en-IN");

  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: rgb(0.98, 0.94, 0.84) });
  page.drawRectangle({ x: 38, y: 48, width: 519.28, height: 745, color: cream, borderColor: border, borderWidth: 1.2 });
  page.drawRectangle({ x: 38, y: 681, width: 519.28, height: 112, color: darkBlue });
  page.drawRectangle({ x: 38, y: 681, width: 519.28, height: 9, color: gold });

  page.drawText("BNI KUTCH EVENT BOOKING", {
    x: 66,
    y: 756,
    size: 10,
    font: boldFont,
    color: gold,
  });
  page.drawText("Laksh Maheshwari Live", {
    x: 66,
    y: 725,
    size: 25,
    font: boldFont,
    color: cream,
  });
  page.drawText("Confirmed Ticket & Invoice", {
    x: 66,
    y: 704,
    size: 12,
    font: regularFont,
    color: rgb(0.95, 0.88, 0.68),
  });

  page.drawRectangle({ x: 386, y: 722, width: 128, height: 28, color: maroon, borderColor: gold, borderWidth: 0.8 });
  page.drawText("CONFIRMED", {
    x: 415,
    y: 732,
    size: 10,
    font: boldFont,
    color: cream,
  });

  const summaryCards = [
    ["Booking ID", getBookingId(booking), 66],
    ["Booking Mode", getBookingModeLabel(booking), 230],
    ["Payment Mode", getPaymentMethodLabel(booking), 394],
  ];

  summaryCards.forEach(([label, value, x]) => {
    page.drawRectangle({ x, y: 623, width: 140, height: 44, color: rgb(1, 0.98, 0.93), borderColor: border, borderWidth: 0.8 });
    page.drawText(label.toUpperCase(), { x: x + 10, y: 648, size: 7.5, font: boldFont, color: muted });
    drawWrappedText(page, value, {
      x: x + 10,
      y: 633,
      maxWidth: 118,
      size: 10,
      font: boldFont,
      color: maroon,
      lineHeight: 11,
    });
  });

  const details = [
    ["Name", booking.name],
    ["Email", booking.email],
    ["Phone", booking.phone || "-"],
    ["GST No.", booking.gstNumber || "-"],
    ["Seats", getSeatSummary(booking)],
    ["Booking Date", bookingDate],
  ];

  page.drawText("Guest Details", { x: 66, y: 589, size: 14, font: boldFont, color: maroon });
  let rowTop = 574;
  details.forEach(([label, value], index) => {
    const valueLines = getWrappedLines(value, regularFont, 9.6, 168);
    const rowHeight = Math.max(27, 16 + valueLines.length * 10);
    const rowY = rowTop - 18;

    page.drawRectangle({
      x: 66,
      y: rowTop - rowHeight,
      width: 290,
      height: rowHeight,
      color: index % 2 ? rgb(1, 0.98, 0.93) : rgb(1, 1, 1),
      borderColor: rgb(0.94, 0.88, 0.75),
      borderWidth: 0.5,
    });
    page.drawText(label.toUpperCase(), { x: 78, y: rowY, size: 7.5, font: boldFont, color: muted });
    valueLines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: 174,
        y: rowY - lineIndex * 10,
        size: 9.6,
        font: regularFont,
        color: ink,
      });
    });
    rowTop -= rowHeight + 4;
  });

  page.drawText("Amount Summary", { x: 386, y: 589, size: 14, font: boldFont, color: maroon });
  const amountRows = [
    ["Base Amount", formatPdfMoney(booking.baseAmount)],
    ["GST", formatPdfMoney(booking.gst)],
    [getPaymentAmountLabel(booking), formatPdfMoney(booking.total)],
  ];

  amountRows.forEach(([label, value], index) => {
    const rowY = 554 - index * 42;
    const isTotal = index === amountRows.length - 1;
    page.drawRectangle({
      x: 386,
      y: rowY - 12,
      width: 128,
      height: 36,
      color: isTotal ? maroon : rgb(1, 1, 1),
      borderColor: isTotal ? maroon : border,
      borderWidth: 0.7,
    });
    page.drawText(label.toUpperCase(), {
      x: 398,
      y: rowY + 8,
      size: 7.3,
      font: boldFont,
      color: isTotal ? gold : muted,
    });
    page.drawText(value, {
      x: 398,
      y: rowY - 5,
      size: isTotal ? 12 : 10,
      font: boldFont,
      color: isTotal ? cream : ink,
    });
  });

  const hasLongSeatList = (booking.seats || []).length > 24;
  const seatListBottom = hasLongSeatList
    ? drawSeatListSummary(page, booking.seats, {
        x: 66,
        y: 338,
        width: 448,
        regularFont,
        boldFont,
        border,
        maroon,
        muted,
      })
    : drawSeatList(page, booking.seats, {
        x: 66,
        y: 338,
        width: 448,
        regularFont,
        boldFont,
        border,
        maroon,
        ink,
        muted,
      });
  const qrTop = Math.min(306, seatListBottom - 4);

  page.drawText("Scan to verify entry", {
    x: 66,
    y: qrTop,
    size: 14,
    font: boldFont,
    color: maroon,
  });
  page.drawRectangle({ x: 66, y: qrTop - 184, width: 170, height: 170, color: rgb(1, 1, 1), borderColor: border, borderWidth: 1 });
  page.drawImage(qrImage, {
    x: 76,
    y: qrTop - 174,
    width: 150,
    height: 150,
  });
  drawWrappedText(page, checkInUrl, {
    x: 254,
    y: qrTop - 36,
    maxWidth: 260,
    size: 8.5,
    font: regularFont,
    color: muted,
    lineHeight: 11,
  });
  drawWrappedText(page, "Please carry this ticket for entry verification. The QR code is valid only after the booking is confirmed by the admin.", {
    x: 254,
    y: qrTop - 92,
    maxWidth: 250,
    size: 10,
    font: boldFont,
    color: red,
    lineHeight: 14,
  });
  page.drawText("BNI Kutch Chapter", {
    x: 66,
    y: 78,
    size: 9,
    font: boldFont,
    color: muted,
  });
  page.drawText("Booking partner KRIVO", {
    x: 395,
    y: 78,
    size: 7.5,
    font: regularFont,
    color: muted,
  });
  page.drawText("XX", {
    x: 481,
    y: 78,
    size: 7.5,
    font: boldFont,
    color: purple,
  });

  if (hasLongSeatList) {
    drawSeatListPage(pdfDocument, booking.seats, {
      regularFont,
      boldFont,
      border,
      maroon,
      gold,
      cream,
      ink,
      muted,
    });
  }

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
  const isCash = booking.paymentMethod === "cash";

  await sendBookingEmail(
    booking,
    isCash ? "Cash Payment Pending" : "Pending Verification",
    `BNI booking received - ${getBookingId(booking)}`,
    isCash
      ? "Excited to welcome you! To confirm your booking, please complete the cash payment within 24 hours."
      : "Your booking has been received and is currently pending payment verification.",
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
