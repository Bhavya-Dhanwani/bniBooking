import { connectDb } from "@/server/db";
import { createError, errorResponse, json, requireAdmin } from "@/server/http";
import { isSiteDown, updateSiteDown } from "@/server/services/siteSettingsService";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await requireAdmin(request);
    await connectDb();
    return json({ siteDown: await isSiteDown() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin(request, { ownerOnly: true });
    await connectDb();
    const body = await request.json();
    if (typeof body.siteDown !== "boolean") {
      throw createError("Site status must be true or false.");
    }

    return json({ siteDown: await updateSiteDown(body.siteDown) });
  } catch (error) {
    return errorResponse(error);
  }
}
