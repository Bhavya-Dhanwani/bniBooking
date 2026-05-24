import Booking from "@/server/models/Booking";
import { connectDb } from "@/server/db";
import { createError, errorResponse, json, requireAdmin } from "@/server/http";

export const runtime = "nodejs";

function serializeBooking(booking) {
  const totalGuests = booking.seats.length;
  const storedCheckedInCount = Number(booking.checkedInCount || 0);
  const checkedInCount = Math.min(
    storedCheckedInCount || (booking.checkedInAt ? totalGuests : 0),
    totalGuests,
  );

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
    paymentMethod: booking.paymentMethod,
    status: booking.status,
    entryAllowed: booking.status === "confirmed",
    date: booking.createdAt,
    checkedInAt: booking.checkedInAt,
    checkedInCount,
    remainingCount: Math.max(totalGuests - checkedInCount, 0),
    totalGuests,
    checkInLogs: booking.checkInLogs || [],
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

async function findBooking(token) {
  if (!token) throw createError("Verification token is required.", 400);

  const booking = await Booking.findOne({ checkInToken: token });
  if (!booking) throw createError("Booking verification link is invalid.", 404);

  return booking;
}

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    await connectDb();
    const { token } = await params;
    const booking = await findBooking(token);

    return json(serializeBooking(booking));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    await connectDb();
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const count = Number(body.count || 0);
    const booking = await findConfirmedBooking(token);
    const totalGuests = booking.seats.length;
    const storedCheckedInCount = Number(booking.checkedInCount || 0);
    const checkedInCount = Math.min(
      storedCheckedInCount || (booking.checkedInAt ? totalGuests : 0),
      totalGuests,
    );
    const remainingCount = Math.max(totalGuests - checkedInCount, 0);

    if (!Number.isInteger(count) || count < 1) {
      throw createError("Select how many people are entering.", 400);
    }
    if (remainingCount < 1) {
      throw createError("All guests for this booking are already checked in.", 409);
    }
    if (count > remainingCount) {
      throw createError(`Only ${remainingCount} guest${remainingCount === 1 ? "" : "s"} remaining for this booking.`, 400);
    }

    booking.checkedInCount = checkedInCount + count;
    booking.checkInLogs.push({
      count,
      checkedInAt: new Date(),
      checkedInBy: admin.displayName,
    });

    if (!booking.checkedInAt && booking.checkedInCount >= totalGuests) {
      booking.checkedInAt = new Date();
    }
    await booking.save();

    return json(serializeBooking(booking));
  } catch (error) {
    return errorResponse(error);
  }
}
