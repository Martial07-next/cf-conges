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

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token || token.statutCompte === "DESACTIVE") {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const rule = RULES.find((r) => pathname.startsWith(r.prefix));
  const adminRHAutorise =
    token.role === "EMPLOYEUR" &&
    (pathname === "/admin" ||
      pathname.startsWith("/admin/utilisateurs") ||
      pathname.startsWith("/admin/soldes"));

  if (rule && !adminRHAutorise && !canAccess(token, rule.tab)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    // Les fichiers statiques de /public (png, jpg, svg, etc.) doivent rester
    // accessibles sans session, notamment sur les pages login/inscription.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)",
  ],
};
