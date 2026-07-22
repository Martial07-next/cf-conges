import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// GET : liste des demandes.
// - collaborateur -> uniquement les siennes
// - employeur/admin -> toutes (filtrable par ?statut=EN_ATTENTE)
// - comptable -> toutes, lecture seule
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  const where = {};
  if (statut) where.statut = statut;
  if (session.user.role === "COLLABORATEUR") where.userId = session.user.id;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { id: true, nom: true, prenom: true, service: true } },
      leaveType: true,
      valideur: { select: { nom: true, prenom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

// POST : creation d'une demande (standard ou exceptionnelle) par le collaborateur connecte.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const { leaveTypeId, dateDebut, dateFin, demiJournee, motif, exceptionnelle } = body;

  if (!leaveTypeId || !dateDebut || !dateFin) {
    return NextResponse.json({ error: "Type de congé et dates obligatoires." }, { status: 400 });
  }

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  if (fin < debut) {
    return NextResponse.json({ error: "La date de fin doit être postérieure à la date de début." }, { status: 400 });
  }

  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType || !leaveType.demandable) {
    return NextResponse.json({ error: "Ce type de congé n'est pas disponible en auto-déclaration." }, { status: 400 });
  }
  if (exceptionnelle && (!motif || motif.trim().length < 5)) {
    return NextResponse.json({ error: "Un motif est obligatoire pour une demande exceptionnelle." }, { status: 400 });
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      leaveTypeId,
      dateDebut: debut,
      dateFin: fin,
      demiJournee: !!demiJournee,
      motif: motif || null,
      exceptionnelle: !!exceptionnelle,
      statut: "EN_ATTENTE",
    },
    include: { leaveType: true },
  });

  await logAudit(session.user.id, "DEMANDE_CREEE", `${leaveType.code} du ${dateDebut} au ${dateFin}`);

  // Notifie les valideurs (employeur + admin)
  const validateurs = await prisma.user.findMany({ where: { role: { in: ["EMPLOYEUR", "ADMIN"] }, statutCompte: "ACTIF" } });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  for (const v of validateurs) {
    await notify(
      v.id,
      "Nouvelle demande",
      `${user.prenom} ${user.nom} a soumis une demande de ${leaveType.libelle}${exceptionnelle ? " (exceptionnelle)" : ""}.`
    );
  }

  return NextResponse.json(request, { status: 201 });
}
