import Booking from "@/server/models/Booking";
import { connectDb } from "@/server/db";
import { createError, errorResponse, json, requireAdmin } from "@/server/http";
import {
  sendConfirmedBookingEmail,
  sendPendingBookingEmail,
  sendMailSafely,
} from "@/server/services/mailService";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    await requireAdmin(request, { ownerOnly: true });
    await connectDb();

    const { id } = await params;
    const body = await request.json();
    const type = body.type;

    if (!["booking", "confirmation"].includes(type)) {
      throw createError("Type must be booking or confirmation.");
    }

    const booking = await Booking.findOne({ bookingId: id });
    if (!booking) throw createError("Booking not found.", 404);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || new URL(request.url).origin;

    if (type === "booking") {
      await sendMailSafely("Resend booking email", () => sendPendingBookingEmail(booking));
    } else {
      if (booking.status !== "confirmed") {
        throw createError("Can only resend confirmation for confirmed bookings.");
      }
      await sendMailSafely("Resend confirmation email", () => sendConfirmedBookingEmail(booking, baseUrl));
    }

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
