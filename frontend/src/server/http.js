import { NextResponse } from "next/server";

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(error) {
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

export function requireAdmin(request) {
  const configuredToken = process.env.ADMIN_TOKEN || "bni-admin";
  const requestToken = request.headers.get("x-admin-token");

  if (!requestToken || requestToken !== configuredToken) {
    throw createError("Admin access required", 401);
  }
}
