import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET : soldes de conges.
// - collaborateur -> les siens uniquement
// - comptable/employeur/admin -> tous (vue paie / pilotage), filtrable par ?userId=
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const where = {};
  if (session.user.role === "COLLABORATEUR") {
    where.userId = session.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  const balances = await prisma.leaveBalance.findMany({
    where,
    include: {
      leaveType: true,
      user: { select: { id: true, nom: true, prenom: true, service: true } },
    },
    orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
  });

  const withRestants = balances.map((b) => ({
    ...b,
    joursRestants: b.leaveType.comptabiliseSolde ? Math.max(0, b.joursAcquis - b.joursPris) : null,
  }));

  return NextResponse.json(withRestants);
}
// POST : creation/mise a jour manuelle d'un solde par l'admin (CP deja poses
// avant la mise en place de l'outil, ou correction).
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const body = await req.json();
  const { userId, leaveTypeId, annee, joursAcquis, joursPris } = body;

  if (!userId || !leaveTypeId || !annee) {
    return NextResponse.json({ error: "Utilisateur, type de congé et année obligatoires." }, { status: 400 });
  }

  const balance = await prisma.leaveBalance.upsert({
    where: { userId_leaveTypeId_annee: { userId, leaveTypeId, annee: Number(annee) } },
    update: { joursAcquis: Number(joursAcquis) || 0, joursPris: Number(joursPris) || 0 },
    create: { userId, leaveTypeId, annee: Number(annee), joursAcquis: Number(joursAcquis) || 0, joursPris: Number(joursPris) || 0 },
    include: { leaveType: true },
  });

  await logAudit(session.user.id, "SOLDE_MODIFIE_ADMIN", `${userId} — ${leaveTypeId} — ${annee}`);

  return NextResponse.json({
    ...balance,
    joursRestants: balance.leaveType.comptabiliseSolde ? Math.max(0, balance.joursAcquis - balance.joursPris) : null,
  });
}
