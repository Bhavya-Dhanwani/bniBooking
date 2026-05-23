import { connectDb } from "@/server/db";
import { errorResponse, json, requireAdmin } from "@/server/http";
import { getStats } from "@/server/services/bookingService";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const access = await requireAdmin(request);
    await connectDb();

    return json({ ...(await getStats()), access });
  } catch (error) {
    return errorResponse(error);
  }
}
