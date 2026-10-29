import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { CATEGORIES_LIENS, categorieDepuisUrl, urlValide } from "@/lib/liensUtiles";

export const dynamic = "force-dynamic";

function nettoyer(body) {
  const url = urlValide(body?.url);
  const titre = typeof body?.titre === "string" ? body.titre.trim().slice(0, 100) : "";
  if (!url) return { erreur: "Adresse invalide : elle doit commencer par http:// ou https://." };
  if (!titre) return { erreur: "Le titre est obligatoire." };
  const categorie = CATEGORIES_LIENS[body?.categorie] ? body.categorie : categorieDepuisUrl(url);
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 200) || null : null;
  return { data: { url, titre, categorie, description } };
}

// GET : liens utiles (tous les comptes connectés).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const liens = await prisma.lienUtile.findMany({ orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(liens);
}

// POST { titre, url, categorie?, description? } : ajout (administrateur).
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  const { data, erreur } = nettoyer(await req.json().catch(() => ({})));
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });
  const dernier = await prisma.lienUtile.findFirst({ orderBy: { ordre: "desc" }, select: { ordre: true } });
  const lien = await prisma.lienUtile.create({ data: { ...data, ordre: (dernier?.ordre ?? -1) + 1 } });
  await logAudit(session.user.id, "LIEN_UTILE_AJOUTE", `${lien.titre} : ${lien.url}`);
  return NextResponse.json(lien, { status: 201 });
}

// PATCH { id, titre, url, categorie?, description? } : modification (administrateur).
export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string") return NextResponse.json({ error: "Lien introuvable." }, { status: 400 });
  const { data, erreur } = nettoyer(body);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });
  const lien = await prisma.lienUtile.update({ where: { id: body.id }, data }).catch(() => null);
  if (!lien) return NextResponse.json({ error: "Lien introuvable." }, { status: 404 });
  return NextResponse.json(lien);
}

// DELETE { id } : suppression (administrateur).
export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "Lien introuvable." }, { status: 400 });
  await prisma.lienUtile.deleteMany({ where: { id } });
  await logAudit(session.user.id, "LIEN_UTILE_SUPPRIME", id);
  return NextResponse.json({ ok: true });
}
