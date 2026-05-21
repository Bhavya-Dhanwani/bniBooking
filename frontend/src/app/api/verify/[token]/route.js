import Booking from "@/server/models/Booking";
import { connectDb } from "@/server/db";
import { createError, errorResponse, json } from "@/server/http";

export const runtime = "nodejs";

function serializeBooking(booking) {
  return {
    id: booking.bookingId,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    gstNumber: booking.gstNumber,
    seats: booking.seats,
    baseAmount: booking.baseAmount,
    gst: booking.gst,
    total: booking.total,
    status: booking.status,
    date: booking.createdAt,
    checkedInAt: booking.checkedInAt,
  };
}

async function findConfirmedBooking(token) {
  if (!token) throw createError("Verification token is required.", 400);

  const booking = await Booking.findOne({ checkInToken: token });
  if (!booking) throw createError("Booking verification link is invalid.", 404);
  if (booking.status !== "confirmed") {
    throw createError("This booking is not confirmed yet.", 409);
  }

  return booking;
}

export async function GET(_request, { params }) {
  try {
    await connectDb();
    const { token } = await params;
    const booking = await findConfirmedBooking(token);

    return json(serializeBooking(booking));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(_request, { params }) {
  try {
    await connectDb();
    const { token } = await params;
    const booking = await findConfirmedBooking(token);

    if (!booking.checkedInAt) {
      booking.checkedInAt = new Date();
      await booking.save();
    }

    return json(serializeBooking(booking));
  } catch (error) {
    return errorResponse(error);
  }
}
