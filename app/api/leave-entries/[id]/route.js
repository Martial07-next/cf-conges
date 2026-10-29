import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// DELETE : retire une entrée ajoutée manuellement.
// Pour les CP, le solde est recalculé à partir des demandes VALIDEES par
// lib/moteurConges.js : supprimer la demande suffit donc à recréditer les jours.
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  const employeurRH = session?.user?.role === "EMPLOYEUR";
  if (!employeurRH && !canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const entry = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    include: { leaveType: true, valideur: { select: { prenom: true, nom: true } } },
  });
  if (!entry) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  // Un Employeur / RH ne supprime que les congés qu'il a lui-même acceptés :
  // ceux acceptés par un autre valideur (cadre, autre employeur, admin) restent.
  if (employeurRH && entry.valideParId && entry.valideParId !== session.user.id) {
    const par = entry.valideur ? ` par ${entry.valideur.prenom} ${entry.valideur.nom}` : "";
    return NextResponse.json(
      { error: `Ce congé a été accepté${par} : seule cette personne ou l'administrateur peut le supprimer.` },
      { status: 403 }
    );
  }

  if (employeurRH) {
    const maintenant = new Date();
    const aujourdHuiUTC = new Date(Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate()
    ));
    const debutUTC = new Date(entry.dateDebut);
    debutUTC.setUTCHours(0, 0, 0, 0);

    if (debutUTC < aujourdHuiUTC) {
      return NextResponse.json(
        { error: "Un Employeur / RH ne peut pas supprimer une entrée déjà passée." },
        { status: 403 }
      );
    }
  }

  await prisma.leaveRequest.delete({ where: { id: params.id } });

  await logAudit(session.user.id, "CONGE_ADMIN_SUPPRIME", entry.id);
  return NextResponse.json({ ok: true });
}
