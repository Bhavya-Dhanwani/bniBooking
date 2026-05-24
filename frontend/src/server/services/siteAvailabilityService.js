import { connectDb } from "@/server/db";
import { isSiteDown } from "@/server/services/siteSettingsService";

export async function getSiteDownStatus() {
  try {
    await connectDb();
    return await isSiteDown();
  } catch {
    return false;
  }
}

export async function blockWhenSiteDown() {
  if (await isSiteDown()) {
    const error = new Error("Bookings will open soon. Please check back shortly.");
    error.statusCode = 503;
    throw error;
  }
}
