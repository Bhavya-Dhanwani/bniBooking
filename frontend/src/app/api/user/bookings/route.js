import Booking from "@/server/models/Booking";
import { connectDb } from "@/server/db";
import { errorResponse, json } from "@/server/http";
import { requireUser } from "@/server/services/authService";

export const runtime = "nodejs";

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
