import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// GET ?date=YYYY-MM-DD : liste des collaborateurs qui ont travaillé ce jour-là
// (pas de congé bloquant, jour ouvré), pour choisir qui régulariser.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "tr")) {
    return NextResponse.json({ error: "Réservé au gestionnaire TR." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  const [y, m, d] = dateParam.split("-").map(Number);
  const jour = new Date(y, m - 1, d);

  if (isWeekend(jour)) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: { statutCompte: "ACTIF", visiblePlanning: true },
    orderBy: { nom: "asc" },
  });

  const leaves = await prisma.leaveRequest.findMany({
    where: { statut: "VALIDE", dateDebut: { lte: jour }, dateFin: { gte: jour } },
    select: { userId: true, leaveType: { select: { retireTicketRestau: true } } },
  });
  const enCongeIds = new Set(leaves.filter((l) => l.leaveType.retireTicketRestau).map((l) => l.userId));

  const dejaRegularises = await prisma.ticketRestauRegularisation.findMany({
    where: { date: jour },
    select: { userId: true, commentaire: true },
  });
  const dejaRegMap = new Map(dejaRegularises.map((r) => [r.userId, r.commentaire]));

  const eligibles = users
    .filter((u) => !enCongeIds.has(u.id))
    .map((u) => ({
      id: u.id,
      nom: u.nom,
      prenom: u.prenom,
      dejaRegularise: dejaRegMap.has(u.id),
      commentaireExistant: dejaRegMap.get(u.id) || "",
    }));

  return NextResponse.json(eligibles);
}

// POST { date, userIds, commentaire } : crée une régularisation (retire 1
// ticket) pour chaque collaborateur sélectionné, à cette date, avec un
// commentaire commun de justification.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "tr")) {
    return NextResponse.json({ error: "Réservé au gestionnaire TR." }, { status: 403 });
  }

  const { date, userIds, commentaire } = await req.json();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "Sélectionnez une date et au moins un collaborateur." }, { status: 400 });
  }
  const [y, m, d] = date.split("-").map(Number);
  const jour = new Date(y, m - 1, d);

  await prisma.ticketRestauRegularisation.createMany({
    data: userIds.map((userId) => ({ userId, date: jour, commentaire: commentaire || null, createdById: session.user.id })),
    skipDuplicates: true,
  });

  await logAudit(session.user.id, "TR_REGULARISATION", `${date} : ${userIds.length} collaborateur(s)${commentaire ? " — " + commentaire : ""}`);

  return NextResponse.json({ ok: true });
}

// DELETE { userId, date } : supprime une régularisation existante — le
// ticket est automatiquement recrédité, sans limite de délai (correction
// rapide en cas d'erreur, gestionnaire TR et administrateur).
export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "tr")) {
    return NextResponse.json({ error: "Réservé au gestionnaire TR." }, { status: 403 });
  }

  const { userId, date } = await req.json();
  if (!userId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  const [y, m, d] = date.split("-").map(Number);
  const jour = new Date(y, m - 1, d);

  await prisma.ticketRestauRegularisation.deleteMany({ where: { userId, date: jour } });

  await logAudit(session.user.id, "TR_REGULARISATION_SUPPRIMEE", `${date} — collaborateur ${userId}`);

  return NextResponse.json({ ok: true });
}
