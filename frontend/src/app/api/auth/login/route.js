import { NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import User from "@/server/models/User";
import { createError, errorResponse } from "@/server/http";
import {
  createSessionToken,
  normalizeEmail,
  setSessionCookie,
  syncBniMemberStatus,
  verifyPassword,
} from "@/server/services/authService";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();

    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!email || !password) throw createError("Please enter email and password.");

    const user = await User.findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw createError("Invalid email or password.", 401);
    }

    await syncBniMemberStatus(user);

    const response = NextResponse.json({ user: user.toJSON() });
    setSessionCookie(response, createSessionToken(user._id));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
