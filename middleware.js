import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { canAccess } from "./lib/permissions";

// Regles d'acces par prefixe de route -> onglet requis (voir lib/permissions.js)
const RULES = [
  { prefix: "/comptable", tab: "comptable" },
  { prefix: "/tr", tab: "tr" },
  { prefix: "/employeur", tab: "employeur" },
  { prefix: "/admin", tab: "admin" },
];

const PUBLIC_PATHS = ["/login", "/inscription"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/api/cron")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.statutCompte === "DESACTIVE") {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const rule = RULES.find((r) => pathname.startsWith(r.prefix));
  if (rule && !canAccess(token, rule.tab)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (token.doitChangerMotDePasse && pathname !== "/profil" && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/profil", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg).*)",
  ],
};
