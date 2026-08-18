import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 5 ? y : y - 1;
}

// DELETE : retire une entrée ajoutée manuellement, et recrédite le solde.
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const entry = await prisma.leaveRequest.findUnique({ where: { id: params.id }, include: { leaveType: true } });
  if (!entry) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (entry.statut === "VALIDE" && entry.leaveType.comptabiliseSolde) {
      const annee = periodeAnnee(entry.dateDebut);
      const jours = Math.max(1, Math.round((entry.dateFin - entry.dateDebut) / (1000 * 60 * 60 * 24)) + 1) * (entry.demiJournee ? 0.5 : 1);
      await tx.leaveBalance.updateMany({
        where: { userId: entry.userId, leaveTypeId: entry.leaveTypeId, annee },
        data: { joursPris: { decrement: jours } },
      });
    }
    await tx.leaveRequest.delete({ where: { id: params.id } });
  });

  await logAudit(session.user.id, "CONGE_ADMIN_SUPPRIME", entry.id);
  return NextResponse.json({ ok: true });
}
