import Booking from "../models/Booking.js";
import { getSeatStatusMap, getStats } from "../services/bookingService.js";
import { deletePaymentScreenshots, uploadPaymentScreenshot } from "../services/cloudinaryService.js";
import { calculateTotals, validateSeatCaps } from "../utils/seatPricing.js";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function getSeatStatus(_req, res, next) {
  try {
    res.json(await getSeatStatusMap());
  } catch (error) {
    next(error);
  }
}

export async function createBooking(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const seats = Array.isArray(req.body.seats) ? req.body.seats : [];
    const screenshot = String(req.body.screenshot || "");

    if (!name) throw createError("Please enter your full name.");
    if (!email || !email.includes("@")) throw createError("Please enter a valid email address.");
    if (!phone || phone.length < 10) throw createError("Please enter a valid phone number.");
    if (!seats.length) throw createError("Please select at least one seat.");
    if (!screenshot.startsWith("data:image/")) throw createError("Please upload a payment screenshot.");

    const capError = validateSeatCaps(seats);
    if (capError) throw createError(capError);

    const [duplicateContact, seatStatus] = await Promise.all([
      Booking.findOne({ $or: [{ email }, { phone }] }),
      getSeatStatusMap(),
    ]);

    if (duplicateContact?.email === email) {
      throw createError("A booking with this email address already exists.");
    }
    if (duplicateContact?.phone === phone) {
      throw createError("A booking with this phone number already exists.");
    }

    const unavailableSeat = seats.find((seatId) => seatStatus[seatId] && seatStatus[seatId] !== "available");
    if (unavailableSeat) throw createError(`${unavailableSeat} is no longer available.`);

    const totals = calculateTotals(seats);
    const bookingId = `BK-${Date.now()}`;
    const uploadedScreenshot = await uploadPaymentScreenshot(screenshot, bookingId);
    const booking = await Booking.create({
      bookingId,
      name,
      email,
      phone,
      seats,
      screenshot: uploadedScreenshot.url,
      screenshotPublicId: uploadedScreenshot.publicId,
      ...totals,
    });

    res.status(201).json(booking);
  } catch (error) {
    if (error.code === 11000) {
      next(createError("A booking with this email or phone already exists."));
      return;
    }
    next(error);
  }
}

export async function listBookings(_req, res, next) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

export async function readStats(_req, res, next) {
  try {
    res.json(await getStats());
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req, res, next) {
  try {
    const status = req.body.status;
    if (!["confirmed", "rejected"].includes(status)) {
      throw createError("Status must be confirmed or rejected.");
    }

    const booking = await Booking.findOneAndUpdate(
      { bookingId: req.params.id },
      { status },
      { new: true },
    );

    if (!booking) throw createError("Booking not found.", 404);

    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function resetBookings(_req, res, next) {
  try {
    const bookings = await Booking.find().select("screenshotPublicId");
    await deletePaymentScreenshots(bookings.map((booking) => booking.screenshotPublicId));
    await Booking.deleteMany({});
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
