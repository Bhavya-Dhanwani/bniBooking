import { NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import { createError, errorResponse } from "@/server/http";
import { blockWhenSiteDown } from "@/server/services/siteAvailabilityService";
import {
  verifyGoogleIdToken,
  upsertGoogleUser,
  setGoogleSessionCookie,
} from "@/server/services/googleAuthService";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();
    await blockWhenSiteDown();

    const body = await request.json();
    const idToken = String(body.idToken || "");
    if (!idToken) throw createError("Google ID token is required.");

    const googleUser = await verifyGoogleIdToken(idToken);
    const user = await upsertGoogleUser(googleUser);

    const response = NextResponse.json({ user: user.toJSON() });
    setGoogleSessionCookie(response, user);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
