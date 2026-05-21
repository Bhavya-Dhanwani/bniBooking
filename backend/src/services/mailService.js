import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    const error = new Error("SMTP settings are not configured.");
    error.statusCode = 500;
    throw error;
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

function bookingDetailsHtml(booking, statusLabel, message) {
  const createdAt = booking.createdAt || booking.date || new Date();

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#333;">
      <h2 style="color:#002244;margin:0 0 8px;">BNI Kutch Event Booking</h2>
      <p style="margin:0 0 18px;">${message}</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;">
        <tbody>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Status</td><td style="padding:8px;border:1px solid #eee;">${statusLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Booking ID</td><td style="padding:8px;border:1px solid #eee;">${booking.bookingId}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Name</td><td style="padding:8px;border:1px solid #eee;">${booking.name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Email</td><td style="padding:8px;border:1px solid #eee;">${booking.email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Phone</td><td style="padding:8px;border:1px solid #eee;">${booking.phone}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Seats</td><td style="padding:8px;border:1px solid #eee;">${booking.seats.join(", ")}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Base Amount</td><td style="padding:8px;border:1px solid #eee;">${formatMoney(booking.baseAmount)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">GST</td><td style="padding:8px;border:1px solid #eee;">${formatMoney(booking.gst)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Total Paid</td><td style="padding:8px;border:1px solid #eee;font-weight:700;color:#e31837;">${formatMoney(booking.total)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Payment Screenshot</td><td style="padding:8px;border:1px solid #eee;"><a href="${booking.screenshot}">View screenshot</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;font-weight:700;">Date</td><td style="padding:8px;border:1px solid #eee;">${new Date(createdAt).toLocaleString("en-IN")}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function bookingDetailsText(booking, statusLabel, message) {
  const createdAt = booking.createdAt || booking.date || new Date();

  return [
    "BNI Kutch Event Booking",
    "",
    message,
    "",
    `Status: ${statusLabel}`,
    `Booking ID: ${booking.bookingId}`,
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
    `Seats: ${booking.seats.join(", ")}`,
    `Base Amount: ${formatMoney(booking.baseAmount)}`,
    `GST: ${formatMoney(booking.gst)}`,
    `Total Paid: ${formatMoney(booking.total)}`,
    `Payment Screenshot: ${booking.screenshot}`,
    `Date: ${new Date(createdAt).toLocaleString("en-IN")}`,
  ].join("\n");
}

async function sendBookingEmail(booking, statusLabel, subject, message) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  await getTransporter().sendMail({
    from,
    to: booking.email,
    subject,
    text: bookingDetailsText(booking, statusLabel, message),
    html: bookingDetailsHtml(booking, statusLabel, message),
  });
}

export async function sendPendingBookingEmail(booking) {
  await sendBookingEmail(
    booking,
    "Pending Verification",
    `BNI booking received - ${booking.bookingId}`,
    "Your booking has been received and is currently pending payment verification.",
  );
}

export async function sendConfirmedBookingEmail(booking) {
  await sendBookingEmail(
    booking,
    "Confirmed",
    `BNI booking confirmed - ${booking.bookingId}`,
    "Your payment has been verified by the admin. Your booking is now confirmed.",
  );
}

export async function sendMailSafely(taskName, sendMail) {
  try {
    await sendMail();
  } catch (error) {
    console.error(`${taskName} failed:`, error.message);
  }
}
