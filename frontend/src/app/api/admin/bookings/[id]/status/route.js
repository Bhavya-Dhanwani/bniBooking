import Booking from "@/server/models/Booking";
import { connectDb } from "@/server/db";
import { randomUUID } from "crypto";
import { createError, errorResponse, json, requireAdmin } from "@/server/http";
import { sendConfirmedBookingEmail, sendMailSafely, sendRejectedBookingEmail } from "@/server/services/mailService";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request, { ownerOnly: true });
    await connectDb();

    const { id } = await params;
    const body = await request.json();
    const status = body.status;

    if (!["confirmed", "rejected"].includes(status)) {
      throw createError("Status must be confirmed or rejected.");
    }

    const previousBooking = await Booking.findOne({ bookingId: id });
    if (!previousBooking) throw createError("Booking not found.", 404);
    if (previousBooking.status === "rejected" && status !== "rejected") {
      throw createError("Rejected bookings cannot be verified again.", 409);
    }

    const update = { status };
    if (status === "confirmed" && !previousBooking.checkInToken) {
      update.checkInToken = randomUUID();
    }

    const booking = await Booking.findOneAndUpdate(
      { bookingId: id },
      update,
      { returnDocument: "after" },
    );

    if (status === "confirmed" && previousBooking.status !== "confirmed") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || new URL(request.url).origin;
      await sendMailSafely("Confirmed booking email", () => sendConfirmedBookingEmail(booking, baseUrl));
    }

    if (status === "rejected" && previousBooking.status !== "rejected") {
      await sendMailSafely("Rejected booking email", () => sendRejectedBookingEmail(booking));
    }

    return json(booking);
  } catch (error) {
    return errorResponse(error);
  }
}
