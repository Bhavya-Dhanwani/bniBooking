import Booking, { allowRepeatedContactBookings } from "@/server/models/Booking";
import { connectDb } from "@/server/db";
import { randomUUID } from "crypto";
import { createError, errorResponse, json } from "@/server/http";
import { getSeatStatusMap } from "@/server/services/bookingService";
import { sendMailSafely, sendPendingBookingEmail } from "@/server/services/mailService";
import { uploadPaymentScreenshot } from "@/server/services/cloudinaryService";
import { calculateTotals, validateSeatCaps } from "@/server/utils/seatPricing";
import { requireUser, syncBniMemberStatus } from "@/server/services/authService";
import { getDiscountState } from "@/server/services/discountAllowanceService";
import { isSiteDown } from "@/server/services/siteSettingsService";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();
    if (await isSiteDown()) {
      throw createError("Booking site is temporarily unavailable. Please try again later.", 503);
    }

    await allowRepeatedContactBookings();
    const sessionUser = await syncBniMemberStatus(await requireUser(request));

    const body = await request.json();
    const name = sessionUser.name;
    const email = sessionUser.email;
    const gstNumber = String(body.gstNumber || "").trim().toUpperCase();
    const seats = Array.isArray(body.seats) ? body.seats : [];
    const screenshot = String(body.screenshot || "");
    const paymentMethod = ["upi", "imps", "cash"].includes(body.paymentMethod) ? body.paymentMethod : "upi";

    if (!seats.length) throw createError("Please select at least one seat.");
    if (paymentMethod !== "cash" && !screenshot.startsWith("data:image/")) {
      throw createError("Please upload a payment screenshot.");
    }

    const capError = validateSeatCaps(seats);
    if (capError) throw createError(capError);

    const seatStatus = await getSeatStatusMap();

    const unavailableSeat = seats.find((seatId) => seatStatus[seatId] && seatStatus[seatId] !== "available");
    if (unavailableSeat) throw createError(`${unavailableSeat} is no longer available.`);

    const { discountAllowance } = await getDiscountState(sessionUser);
    const totals = calculateTotals(seats, discountAllowance);
    const bookingId = `BK-${Date.now()}`;
    const uploadedScreenshot = screenshot.startsWith("data:image/")
      ? await uploadPaymentScreenshot(screenshot, bookingId)
      : { url: "", publicId: "" };
    const booking = await Booking.create({
      bookingId,
      name,
      email,
      userId: sessionUser._id,
      gstNumber,
      seats,
      paymentMethod,
      checkInToken: randomUUID(),
      screenshot: uploadedScreenshot.url,
      screenshotPublicId: uploadedScreenshot.publicId,
      ...totals,
    });

    await sendMailSafely("Pending booking email", () => sendPendingBookingEmail(booking));

    return json({ ...booking.toJSON(), ...(await getDiscountState(sessionUser)) }, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(createError("Unable to create a unique booking. Please try again."));
    }
    return errorResponse(error);
  }
}
