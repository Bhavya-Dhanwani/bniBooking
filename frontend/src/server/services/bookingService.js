import Booking from "../models/Booking";
import { getPreBookedSeatIds } from "@/shared/seatMap";

export async function getSeatStatusMap() {
  const activeBookings = await Booking.find({
    status: { $in: ["pending", "confirmed"] },
  }).select("seats status");

  const preBookedStatus = getPreBookedSeatIds().reduce((statusMap, seatId) => {
    statusMap[seatId] = "booked";
    return statusMap;
  }, {});

  return activeBookings.reduce((statusMap, booking) => {
    booking.seats.forEach((seatId) => {
      statusMap[seatId] = booking.status === "confirmed" ? "booked" : "pending";
    });
    return statusMap;
  }, preBookedStatus);
}

export async function getStats() {
  const [bookings, seatStatus] = await Promise.all([
    Booking.find().select("status"),
    getSeatStatusMap(),
  ]);

  return {
    totalBookings: bookings.length,
    pending: bookings.filter((booking) => booking.status === "pending").length,
    confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
    rejected: bookings.filter((booking) => booking.status === "rejected").length,
    seatsConfirmed: Object.values(seatStatus).filter((status) => status === "booked").length,
    seatsPending: Object.values(seatStatus).filter((status) => status === "pending").length,
  };
}
