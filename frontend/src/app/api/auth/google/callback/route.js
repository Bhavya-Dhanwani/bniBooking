import { NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import { createError } from "@/server/http";
import { blockWhenSiteDown } from "@/server/services/siteAvailabilityService";
import {
  getGoogleOAuthConfig,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  upsertGoogleUser,
  setGoogleSessionCookie,
} from "@/server/services/googleAuthService";

export const runtime = "nodejs";

function getBaseUrl(request) {
  if (request.nextUrl?.origin) return request.nextUrl.origin;
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

function verifyOAuthState(state, cookies) {
  const expected = cookies.get("google_oauth_state")?.value;
  if (!expected || !state || state !== expected) {
    throw createError("Invalid OAuth state. Please try again.", 401);
  }
}

function clearOAuthStateCookie(response) {
  response.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
}

export async function GET(request) {
  try {
    await connectDb();
    await blockWhenSiteDown();

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const baseUrl = getBaseUrl(request);

    if (error) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_denied`);
    }

    if (!code) throw createError("Authorization code is required.");

    verifyOAuthState(state, request.cookies);

    const { clientId } = getGoogleOAuthConfig();
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const googleUser = await fetchGoogleUserInfo(tokens.access_token);

    if (!googleUser.email) throw createError("Google account has no email.");
    if (!googleUser.email_verified) throw createError("Google email is not verified.");

    const user = await upsertGoogleUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name || "",
    });

    const response = NextResponse.redirect(baseUrl);
    setGoogleSessionCookie(response, user);
    clearOAuthStateCookie(response);
    return response;
  } catch (error) {
    const baseUrl = getBaseUrl(request);
    const message = encodeURIComponent(error.message || "Google login failed");
    return NextResponse.redirect(`${baseUrl}/login?error=${message}`);
  }
}
