import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { calculerSoldeCP } from "@/lib/moteurConges";
import { arrondi2 } from "@/lib/campagneConges";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "employeur")) {
    return NextResponse.json({ error: "Réservé à l'employeur/admin." }, { status: 403 });
  }

  const { reponseAdmin, appliquerCorrectionN, valeurCibleN } = await req.json();
  const existante = await prisma.verificationSolde.findUnique({ where: { id: params.id } });
  if (!existante) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }
  if (existante.statut !== "EN_ATTENTE") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
  }

  let correction = null;

  if (appliquerCorrectionN) {
    const cible = Number(valeurCibleN);
    if (!Number.isFinite(cible) || cible < 0) {
      return NextResponse.json({ error: "Le solde cible N est invalide." }, { status: 400 });
    }

    const soldeActuel = await calculerSoldeCP(prisma, existante.userId, new Date());
    const ecart = arrondi2(cible - soldeActuel.disponible);
    const motif = reponseAdmin?.trim() || "Correction après signalement d'une erreur de solde";

    correction = await prisma.leaveBalanceAdjustment.create({
      data: {
        userId: existante.userId,
        annee: soldeActuel.campagne,
        montant: ecart,
        motif: `${motif} (solde N corrigé à ${cible} j depuis la demande ${params.id})`,
        createdById: session.user.id,
      },
    });

    await logAudit(
      session.user.id,
      "AJUSTEMENT_SOLDE_CREE",
      `${existante.userId} — campagne ${soldeActuel.campagne} — écart ${ecart >= 0 ? "+" : ""}${ecart}j — cible ${cible}j — vérification ${params.id}`
    );
  }

  const demande = await prisma.verificationSolde.update({
    where: { id: params.id },
    data: {
      statut: "TRAITEE",
      reponseAdmin: reponseAdmin || null,
      traiteParId: session.user.id,
      dateTraitement: new Date(),
    },
  });

  await logAudit(session.user.id, "VERIFICATION_SOLDE_TRAITEE", params.id);
  await notify(
    demande.userId,
    correction ? "Solde CP corrigé" : "Vérification de solde traitée",
    correction
      ? `Votre solde CP N a été corrigé à ${Number(valeurCibleN)} j.${reponseAdmin ? ` ${reponseAdmin}` : ""}`
      : reponseAdmin || "Votre demande de vérification de solde a été traitée."
  );

  return NextResponse.json({ demande, correction });
}
