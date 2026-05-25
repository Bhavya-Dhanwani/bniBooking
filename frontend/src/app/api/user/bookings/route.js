import Booking from "@/server/models/Booking";
import { connectDb } from "@/server/db";
import { createError, errorResponse, json } from "@/server/http";
import { requireUser } from "@/server/services/authService";

export const runtime = "nodejs";

function normalizePhone(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export async function GET(request) {
  try {
    await connectDb();
    const user = await requireUser(request);
    const bookings = await Booking.find({
      $or: [{ userId: user._id }, { userId: null, email: user.email }],
    }).sort({ createdAt: -1 });

    return json(bookings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    await connectDb();
    const user = await requireUser(request);
    const body = await request.json();
    const bookingId = String(body.bookingId || "").trim();
    const phone = normalizePhone(body.phone);

    if (!bookingId) throw createError("Booking ID is required.");
    if (!phone) throw createError("Please enter your phone number.");
    if (!isValidPhone(phone)) throw createError("Please enter a valid phone number.");

    const previousBooking = await Booking.findOne({
      bookingId,
      $or: [{ userId: user._id }, { userId: null, email: user.email }],
    }).select("status");

    if (!previousBooking) throw createError("Booking not found.", 404);
    if (previousBooking.status === "confirmed") {
      throw createError("Phone number cannot be changed after confirmation.", 409);
    }

    const booking = await Booking.findOneAndUpdate(
      {
        bookingId,
        $or: [{ userId: user._id }, { userId: null, email: user.email }],
      },
      { phone },
      { new: true },
    );

    return json(booking);
  } catch (error) {
    return errorResponse(error);
  }
}
