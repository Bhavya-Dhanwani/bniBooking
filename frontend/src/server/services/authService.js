import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "@/server/models/User";
import MemberRegistry from "@/server/models/MemberRegistry";
import { createError } from "@/server/http";

export const COOKIE_NAME = "bni_session";
const SESSION_DAYS = 7;
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password) {
  return bcrypt.hash(String(password), BCRYPT_ROUNDS);
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  return bcrypt.compare(String(password), storedHash);
}

export function createSessionToken(userId) {
  const payload = {
    userId: String(userId),
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function setSessionCookie(response, token) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export function clearSessionCookie(response) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function getSessionUser(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  return User.findById(payload.userId);
}

export async function requireUser(request) {
  const user = await getSessionUser(request);
  if (!user) throw createError("Login required.", 401);
  return user;
}

export async function isRegisteredBniMember(email) {
  const member = await MemberRegistry.findOne({
    email: normalizeEmail(email),
    active: { $ne: false },
  }).select("_id");
  return Boolean(member);
}

export async function syncBniMemberStatus(user) {
  const isBniMember = await isRegisteredBniMember(user.email);
  if (user.isBniMember !== isBniMember) {
    user.isBniMember = isBniMember;
    await user.save();
  }
  return user;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function verifySessionToken(token) {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature || !timingSafeEqual(sign(encodedPayload), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.userId || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sign(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function getSessionSecret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_TOKEN || "bni-local-auth-secret";
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
