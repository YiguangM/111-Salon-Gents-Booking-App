import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Kept as a literal (rather than imported from lib/auth) so this edge
// proxy doesn't pull in bcryptjs/next-headers via that module.
const ADMIN_SESSION_COOKIE_NAME = "admin_session";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

const PUBLIC_PATHS = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      await jwtVerify(token, getSecretKey());
      return NextResponse.next();
    } catch {
      // fall through to unauthorized handling below
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
