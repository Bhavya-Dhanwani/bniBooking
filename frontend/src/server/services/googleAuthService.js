import User from "@/server/models/User";
import { createError } from "@/server/http";
import {
  createSessionToken,
  isRegisteredBniMember,
  normalizeEmail,
  setSessionCookie,
  syncBniMemberStatus,
} from "@/server/services/authService";

const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function getGoogleOAuthConfig() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  return { clientId, clientSecret };
}

export async function verifyGoogleIdToken(idToken) {
  const res = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw createError("Invalid Google token.", 401);
  const payload = await res.json();

  if (!payload.email) throw createError("Google token missing email.", 401);
  if (payload.email_verified !== "true") throw createError("Google email is not verified.", 401);

  const iss = payload.iss;
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
    throw createError("Invalid Google token issuer.", 401);
  }

  return {
    googleId: payload.sub,
    email: normalizeEmail(payload.email),
    name: payload.name || "",
  };
}

export async function exchangeCodeForTokens(code, redirectUri) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  if (!clientId || !clientSecret) throw createError("Google OAuth is not configured.", 500);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) throw createError("Failed to exchange Google authorization code.", 401);
  return res.json();
}

export async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw createError("Failed to fetch Google user info.", 401);
  return res.json();
}

export async function upsertGoogleUser(googleData) {
  const email = normalizeEmail(googleData.email);
  let user = await User.findOne({ email });

  if (user) {
    if (!user.googleId) {
      user.googleId = googleData.googleId;
      await user.save();
    }
  } else {
    user = await User.create({
      name: googleData.name || "",
      email,
      passwordHash: "",
      googleId: googleData.googleId,
      isBniMember: await isRegisteredBniMember(email),
    });
  }

  await syncBniMemberStatus(user);
  return user;
}

export function setGoogleSessionCookie(response, user) {
  setSessionCookie(response, createSessionToken(user._id));
}
