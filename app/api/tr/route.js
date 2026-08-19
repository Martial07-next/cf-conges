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
// (pas en congé, jour ouvré), pour choisir qui régulariser.
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
    select: { userId: true },
  });
  const enCongeIds = new Set(leaves.map((l) => l.userId));

  const dejaRegularises = await prisma.ticketRestauRegularisation.findMany({
    where: { date: jour },
    select: { userId: true },
  });
  const dejaRegIds = new Set(dejaRegularises.map((r) => r.userId));

  const eligibles = users
    .filter((u) => !enCongeIds.has(u.id))
    .map((u) => ({ id: u.id, nom: u.nom, prenom: u.prenom, dejaRegularise: dejaRegIds.has(u.id) }));

  return NextResponse.json(eligibles);
}

// POST { date, userIds } : crée une régularisation (retire 1 ticket) pour
// chaque collaborateur sélectionné, à cette date.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "tr")) {
    return NextResponse.json({ error: "Réservé au gestionnaire TR." }, { status: 403 });
  }

  const { date, userIds } = await req.json();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "Sélectionnez une date et au moins un collaborateur." }, { status: 400 });
  }
  const [y, m, d] = date.split("-").map(Number);
  const jour = new Date(y, m - 1, d);

  await prisma.ticketRestauRegularisation.createMany({
    data: userIds.map((userId) => ({ userId, date: jour, createdById: session.user.id })),
    skipDuplicates: true,
  });

  await logAudit(session.user.id, "TR_REGULARISATION", `${date} : ${userIds.length} collaborateur(s)`);

  return NextResponse.json({ ok: true });
}
