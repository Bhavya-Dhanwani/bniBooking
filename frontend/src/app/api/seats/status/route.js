import { connectDb, isDatabaseConnectionError } from "@/server/db";
import { errorResponse, json } from "@/server/http";
import { getSeatStatusMap } from "@/server/services/bookingService";
import { getPreBookedSeatIds } from "@/shared/seatMap";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDb();
    return json(await getSeatStatusMap());
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const preBookedStatus = getPreBookedSeatIds().reduce((statusMap, seatId) => {
        statusMap[seatId] = "booked";
        return statusMap;
      }, {});
      return json(preBookedStatus);
    }

    return errorResponse(error);
  }
}
