import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/server/services/authService";

const PUBLIC_PAGES = new Set(["/login", "/signup"]);

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(verifySessionToken(token));

  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
