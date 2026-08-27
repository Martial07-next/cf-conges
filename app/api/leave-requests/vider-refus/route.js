import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// DELETE : masque l'ensemble de l'historique des refus dans la vue
// "Validation & accès" (Admin uniquement — l'employeur ne peut pas le faire).
// N'affecte ni le solde, ni l'historique personnel du collaborateur
// (Mes demandes / tableau de bord), qui reste géré séparément.
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const { count } = await prisma.leaveRequest.updateMany({
    where: { statut: "REFUSE", leaveType: { demandable: true, code: { not: "ec" } } },
    data: { masqueHistoriqueAdmin: true },
  });

  await logAudit(session.user.id, "HISTORIQUE_REFUS_VIDE", `${count} demande(s) masquée(s)`);

  return NextResponse.json({ ok: true, count });
}
