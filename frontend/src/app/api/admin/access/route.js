import AdminAccess from "@/server/models/AdminAccess";
import { connectDb } from "@/server/db";
import { hashPassword } from "@/server/services/authService";
import { createError, errorResponse, json, requireAdmin } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await requireAdmin(request, { ownerOnly: true });
    const body = await request.json();
    const displayName = String(body.displayName || "").trim();
    const password = String(body.password || "");

    if (displayName.length < 2 || displayName.length > 80) {
      throw createError("Enter a name between 2 and 80 characters.");
    }
    if (password.length < 8) {
      throw createError("Password must be at least 8 characters.");
    }

    await connectDb();
    await AdminAccess.create({
      displayName,
      passwordHash: await hashPassword(password),
      role: "viewer",
    });

    return json({ displayName, role: "viewer" }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
