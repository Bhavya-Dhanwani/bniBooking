import { connectDb } from "@/server/db";
import { createError, errorResponse, json, requireAdmin } from "@/server/http";
import { isDiscountEnabled, updateDiscountEnabled } from "@/server/services/siteSettingsService";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    requireAdmin(request);
    await connectDb();
    return json({ discountEnabled: await isDiscountEnabled() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    requireAdmin(request);
    await connectDb();
    const body = await request.json();
    if (typeof body.discountEnabled !== "boolean") {
      throw createError("Discount status must be true or false.");
    }

    return json({ discountEnabled: await updateDiscountEnabled(body.discountEnabled) });
  } catch (error) {
    return errorResponse(error);
  }
}
