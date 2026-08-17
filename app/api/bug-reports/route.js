import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// POST : signalement d'un bug depuis le bouton "Signaler un problème".
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const { message, page } = body;

  if (!message || message.trim().length < 5) {
    return NextResponse.json({ error: "Merci de décrire le problème (5 caractères minimum)." }, { status: 400 });
  }

  const report = await prisma.bugReport.create({
    data: { userId: session.user.id, message: message.trim(), page: page || null },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN", statutCompte: "ACTIF" } });
  const auteur = await prisma.user.findUnique({ where: { id: session.user.id } });

  for (const admin of admins) {
    await notify(
      admin.id,
      "Problème signalé",
      `${auteur.prenom} ${auteur.nom} a signalé un problème${page ? ` sur ${page}` : ""} : ${message.trim()}`
    );
  }

  return NextResponse.json(report, { status: 201 });
}

// GET : liste des signalements (page Admin > Signalements)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const reports = await prisma.bugReport.findMany({
    include: { user: { select: { nom: true, prenom: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reports);
}
