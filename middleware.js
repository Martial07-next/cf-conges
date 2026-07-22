import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// Regles d'acces par prefixe de route -> roles autorises
const RULES = [
  { prefix: "/comptable", roles: ["COMPTABLE", "ADMIN"] },
  { prefix: "/employeur", roles: ["EMPLOYEUR", "ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

const PUBLIC_PATHS = ["/login", "/inscription"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/api/auth") || pathname.startsWith("/api/register")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const rule = RULES.find((r) => pathname.startsWith(r.prefix));
  if (rule && !rule.roles.includes(token.role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg).*)",
  ],
};
