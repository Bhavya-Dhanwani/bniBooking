import Booking from "@/server/models/Booking";
import { connectDb } from "@/server/db";
import { errorResponse, json, noContent, requireAdmin } from "@/server/http";
import { deletePaymentScreenshots } from "@/server/services/cloudinaryService";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await requireAdmin(request);
    await connectDb();

    const bookings = await Booking.find().sort({ createdAt: -1 });
    return json(bookings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin(request, { ownerOnly: true });
    await connectDb();

    const bookings = await Booking.find().select("screenshotPublicId");
    await deletePaymentScreenshots(bookings.map((booking) => booking.screenshotPublicId));
    await Booking.deleteMany({});

    return noContent();
  } catch (error) {
    return errorResponse(error);
  }
}
