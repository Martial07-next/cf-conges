import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { delaiRespecte, DELAI_MIN_JOURS } from "@/lib/regles";

async function creditSolde(tx, request) {
  if (!request.leaveType.comptabiliseSolde) return;
  const annee = request.dateDebut.getFullYear();
  const jours =
    Math.max(1, Math.round((request.dateFin - request.dateDebut) / (1000 * 60 * 60 * 24)) + 1) *
    (request.demiJournee ? 0.5 : 1);

  await tx.leaveBalance.upsert({
    where: { userId_leaveTypeId_annee: { userId: request.userId, leaveTypeId: request.leaveTypeId, annee } },
    update: { joursPris: { decrement: jours } },
    create: {
      userId: request.userId,
      leaveTypeId: request.leaveTypeId,
      annee,
      joursAcquis: request.leaveType.plafondAnnuel || 0,
      joursPris: -jours,
    },
  });
}

// PATCH : valider / refuser (employeur, admin), annuler une demande en attente
// (le demandeur), demander l'annulation d'un congé déjà validé (le demandeur,
// si le délai de 21 jours est respecté), ou traiter cette demande d'annulation
// (employeur, admin).
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { action, commentaireRefus, motif } = await req.json();
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
    if (!canAccess(session.user, "employeur")) {
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
        const jours =
          Math.max(1, Math.round((request.dateFin - request.dateDebut) / (1000 * 60 * 60 * 24)) + 1) *
          (request.demiJournee ? 0.5 : 1);

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

  // --- Demande d'annulation d'un congé déjà validé (par le collaborateur) ---
  if (action === "demander_annulation") {
    if (request.userId !== session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez demander l'annulation que de vos propres congés." }, { status: 403 });
    }
    if (request.statut !== "VALIDE") {
      return NextResponse.json({ error: "Seul un congé déjà validé peut faire l'objet d'une demande d'annulation." }, { status: 400 });
    }
    if (request.annulationDemandee) {
      return NextResponse.json({ error: "Une demande d'annulation est déjà en cours pour ce congé." }, { status: 400 });
    }
    if (!delaiRespecte(request.dateDebut)) {
      return NextResponse.json(
        { error: `Il n'est plus possible de demander l'annulation à moins de ${DELAI_MIN_JOURS} jours du début du congé.` },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { annulationDemandee: true, motifAnnulation: motif || null, dateDemandeAnnulation: new Date() },
    });

    await logAudit(session.user.id, "ANNULATION_DEMANDEE", request.id);

    const destinataires = await prisma.user.findMany({
      where: { OR: [{ role: "ADMIN" }, { role: "EMPLOYEUR" }] },
      select: { id: true },
    });
    await Promise.all(
      destinataires.map((d) =>
        notify(
          d.id,
          "Demande d'annulation de congé",
          `${request.user.prenom} ${request.user.nom} demande l'annulation de son congé (${request.leaveType.libelle}) du ${new Date(
            request.dateDebut
          ).toLocaleDateString("fr-FR")}.`
        )
      )
    );

    return NextResponse.json(updated);
  }

  // --- Traitement de la demande d'annulation (par l'employeur/admin) ---
  if (action === "approuver_annulation" || action === "refuser_annulation") {
    if (!canAccess(session.user, "employeur")) {
      return NextResponse.json({ error: "Seuls l'employeur ou l'administrateur peuvent traiter une demande d'annulation." }, { status: 403 });
    }
    if (!request.annulationDemandee) {
      return NextResponse.json({ error: "Aucune demande d'annulation en cours pour ce congé." }, { status: 400 });
    }

    if (action === "refuser_annulation") {
      const updated = await prisma.leaveRequest.update({
        where: { id: params.id },
        data: { annulationDemandee: false, motifAnnulation: null, dateDemandeAnnulation: null },
      });
      await logAudit(session.user.id, "ANNULATION_REFUSEE", request.id);
      await notify(request.userId, "Demande d'annulation refusée", `Votre demande d'annulation du congé du ${new Date(request.dateDebut).toLocaleDateString("fr-FR")} a été refusée.`);
      return NextResponse.json(updated);
    }

    // approuver_annulation : le congé repasse à ANNULE et le solde est recrédité automatiquement.
    const updated = await prisma.$transaction(async (tx) => {
      await creditSolde(tx, request);
      return tx.leaveRequest.update({
        where: { id: params.id },
        data: {
          statut: "ANNULE",
          annulationDemandee: false,
          valideParId: session.user.id,
          dateValidation: new Date(),
        },
      });
    });

    await logAudit(session.user.id, "ANNULATION_APPROUVEE", request.id);
    await notify(request.userId, "Congé annulé", `Votre congé du ${new Date(request.dateDebut).toLocaleDateString("fr-FR")} a été annulé, vos jours ont été recrédités.`);

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
