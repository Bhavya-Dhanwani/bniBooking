import { NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import User from "@/server/models/User";
import { createError, errorResponse } from "@/server/http";
import {
  createSessionToken,
  hashPassword,
  isRegisteredBniMember,
  normalizeEmail,
  setSessionCookie,
} from "@/server/services/authService";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();

    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!name) throw createError("Please enter your full name.");
    if (!email || !email.includes("@")) throw createError("Please enter a valid email address.");
    if (password.length < 6) throw createError("Password must be at least 6 characters.");

    const existing = await User.findOne({ email });
    if (existing) throw createError("An account with this email already exists.", 409);

    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      isBniMember: await isRegisteredBniMember(email),
    });

    const response = NextResponse.json({ user: user.toJSON() }, { status: 201 });
    setSessionCookie(response, createSessionToken(user._id));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
