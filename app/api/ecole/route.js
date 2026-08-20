import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST : l'alternant ajoute lui-même une période "École" — validée
// automatiquement, sans passer par l'employeur/admin.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user.estAlternant) {
    return NextResponse.json({ error: "Réservé aux comptes alternants." }, { status: 403 });
  }

  const { dateDebut, dateFin } = await req.json();
  if (!dateDebut || !dateFin) {
    return NextResponse.json({ error: "Dates de début et de fin obligatoires." }, { status: 400 });
  }

  const ec = await prisma.leaveType.findUnique({ where: { code: "ec" } });
  if (!ec) return NextResponse.json({ error: "Type de congé École introuvable." }, { status: 500 });

  const entry = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      leaveTypeId: ec.id,
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
      statut: "VALIDE",
      motif: "Période école",
      gereParAlternant: true,
    },
    include: { leaveType: true },
  });

  await logAudit(session.user.id, "ECOLE_AJOUTEE", `${dateDebut} → ${dateFin}`);
  return NextResponse.json(entry, { status: 201 });
}
