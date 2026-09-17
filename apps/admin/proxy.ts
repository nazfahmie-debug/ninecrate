import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return new Response(
      "Dashboard authentication is not configured. Set ADMIN_USERNAME and " +
        "ADMIN_PASSWORD in .env (see .env.example) and restart the server.",
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const sepIndex = decoded.indexOf(":");
    const providedUser = sepIndex >= 0 ? decoded.slice(0, sepIndex) : decoded;
    const providedPass = sepIndex >= 0 ? decoded.slice(sepIndex + 1) : "";

    if (safeEqual(providedUser, username) && safeEqual(providedPass, password)) {
      return NextResponse.next();
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Ninecrate Admin"' },
  });
}
