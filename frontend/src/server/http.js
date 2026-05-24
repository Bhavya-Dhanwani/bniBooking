import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { connectDb, isDatabaseConnectionError } from "@/server/db";
import AdminAccess from "@/server/models/AdminAccess";

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(error) {
  if (isDatabaseConnectionError(error)) {
    return NextResponse.json(
      { message: "Database connection is currently unavailable. Please try again in a few minutes." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { message: error.message || "Something went wrong" },
    { status: error.statusCode || 500 },
  );
}

export function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function getAdminTokenDigest(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireAdmin(request, { ownerOnly = false } = {}) {
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || process.env.ADMIN_TOKEN || "bni-admin";
  const requestPassword = request.headers.get("x-admin-token");

  if (!requestPassword) {
    throw createError("Admin access required", 401);
  }

  if (requestPassword === superAdminPassword) {
    return {
      role: "superadmin",
      displayName: "Super Admin",
      canVerify: true,
      canManage: true,
    };
  }

  await connectDb();
  let account = await AdminAccess.findOne({
    tokenDigest: getAdminTokenDigest(requestPassword),
    active: true,
  }).select("displayName role passwordHash");

  if (!account) {
    const accounts = await AdminAccess.find({ active: true, passwordHash: { $exists: true, $ne: "" } }).select(
      "+passwordHash displayName role",
    );
    for (const candidate of accounts) {
      if (await bcrypt.compare(requestPassword, candidate.passwordHash)) {
        account = candidate;
        break;
      }
    }
  }

  if (!account) {
    throw createError("Admin access required", 401);
  }

  const canManage = account.role === "admin";

  if (ownerOnly && !canManage) {
    throw createError("Only an admin can perform this action.", 403);
  }

  return {
    role: account.role,
    displayName: account.displayName,
    canVerify: canManage,
    canManage,
  };
}
