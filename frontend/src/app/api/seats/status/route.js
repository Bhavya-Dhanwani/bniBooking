import { connectDb, isDatabaseConnectionError } from "@/server/db";
import { errorResponse, json } from "@/server/http";
import { getSeatStatusMap } from "@/server/services/bookingService";
import { getPreBookedSeatIds, PDF_LAYOUT } from "@/shared/seatMap";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDb();
    return json(await getSeatStatusMap());
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const statusMap = getPreBookedSeatIds().reduce((map, seatId) => {
        map[seatId] = "booked";
        return map;
      }, {});

      const pdfSeats = PDF_LAYOUT.seats.slice(0, 5);
      pdfSeats.forEach((seat) => {
        statusMap[seat.id] = "pending";
      });

      return json(statusMap);
    }

    return errorResponse(error);
  }
}
