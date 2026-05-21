import { Router } from "express";
import {
  createBooking,
  getSeatStatus,
  listBookings,
  readStats,
  resetBookings,
  updateBookingStatus,
} from "../controllers/bookingController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.get("/seats/status", getSeatStatus);
router.post("/bookings", createBooking);

router.get("/admin/bookings", requireAdmin, listBookings);
router.delete("/admin/bookings", requireAdmin, resetBookings);
router.get("/admin/stats", requireAdmin, readStats);
router.patch("/admin/bookings/:id/status", requireAdmin, updateBookingStatus);

export default router;
