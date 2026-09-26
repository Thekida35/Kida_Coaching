import { NextRequest, NextResponse } from "next/server";
import { COOKIE, checkToken } from "@/lib/hub/auth";

const OPEN = [/^\/login$/, /^\/api\/login$/, /^\/manifest\.webmanifest$/, /^\/icons\//, /^\/sw\.js$/, /^\/api\/cron\//, /^\/api\/admin\//, /^\/api\/import\//, /^\/login\.html$/];

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p === "/login") return NextResponse.rewrite(new URL("/login.html", req.url));
  if (OPEN.some((r) => r.test(p))) return NextResponse.next();
  const ok = await checkToken(req.cookies.get(COOKIE)?.value);
  if (!ok) {
    if (p.startsWith("/api/")) return NextResponse.json({ error: "auth" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (p === "/") return NextResponse.rewrite(new URL("/app.html", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/|favicon).*)"] };
