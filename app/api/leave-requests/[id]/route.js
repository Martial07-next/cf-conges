import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

// PATCH : valider / refuser (employeur, admin) ou annuler (le demandeur, si encore en attente)
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { action, commentaireRefus } = await req.json();
  const request = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    include: { leaveType: true, user: true },
  });
  if (!request) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });

  if (action === "annuler") {
    if (request.userId !== session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez annuler que vos propres demandes." }, { status: 403 });
    }
    if (request.statut !== "EN_ATTENTE") {
      return NextResponse.json({ error: "Seule une demande en attente peut être annulée." }, { status: 400 });
    }
    const updated = await prisma.leaveRequest.update({ where: { id: params.id }, data: { statut: "ANNULE" } });
    await logAudit(session.user.id, "DEMANDE_ANNULEE", request.id);
    return NextResponse.json(updated);
  }

  if (action === "valider" || action === "refuser") {
    if (!["EMPLOYEUR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Seuls l'employeur ou l'administrateur peuvent valider/refuser." }, { status: 403 });
    }
    if (request.statut !== "EN_ATTENTE") {
      return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
    }
    if (action === "refuser" && (!commentaireRefus || commentaireRefus.trim().length < 3)) {
      return NextResponse.json({ error: "Un motif de refus est obligatoire." }, { status: 400 });
    }

    const nouveauStatut = action === "valider" ? "VALIDE" : "REFUSE";

    const updated = await prisma.$transaction(async (tx) => {
      const req2 = await tx.leaveRequest.update({
        where: { id: params.id },
        data: {
          statut: nouveauStatut,
          valideParId: session.user.id,
          dateValidation: new Date(),
          commentaireRefus: action === "refuser" ? commentaireRefus : null,
        },
      });

      if (action === "valider" && request.leaveType.comptabiliseSolde) {
        const annee = request.dateDebut.getFullYear();
        const jours = Math.max(
          1,
          Math.round((request.dateFin - request.dateDebut) / (1000 * 60 * 60 * 24)) + 1
        ) * (request.demiJournee ? 0.5 : 1);

        await tx.leaveBalance.upsert({
          where: {
            userId_leaveTypeId_annee: { userId: request.userId, leaveTypeId: request.leaveTypeId, annee },
          },
          update: { joursPris: { increment: jours } },
          create: {
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
            annee,
            joursAcquis: request.leaveType.plafondAnnuel || 0,
            joursPris: jours,
          },
        });
      }

      return req2;
    });

    await logAudit(session.user.id, action === "valider" ? "DEMANDE_VALIDEE" : "DEMANDE_REFUSEE", request.id);

    await notify(
      request.userId,
      action === "valider" ? "Demande validée" : "Demande refusée",
      action === "valider"
        ? `Votre demande de ${request.leaveType.libelle} a été validée.`
        : `Votre demande de ${request.leaveType.libelle} a été refusée : ${commentaireRefus}`
    );

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
