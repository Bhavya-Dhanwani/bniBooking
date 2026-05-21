import { connectDb } from "@/server/db";
import { errorResponse, json } from "@/server/http";
import { getSeatStatusMap } from "@/server/services/bookingService";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDb();
    return json(await getSeatStatusMap());
  } catch (error) {
    return errorResponse(error);
  }
}
