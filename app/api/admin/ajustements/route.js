import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { calculerSoldeCP } from "@/lib/moteurConges";
import { arrondi2 } from "@/lib/campagneConges";

export const dynamic = "force-dynamic";

// POST : ajoute/retire un montant sur une campagne ou, sur demande explicite,
// calcule l'écart nécessaire pour atteindre un solde final. Dans les deux cas,
// l'historique reste traçable via LeaveBalanceAdjustment.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  const employeurRH = session?.user?.role === "EMPLOYEUR";
  if (!employeurRH && !canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur ou à l'Employeur / RH." }, { status: 403 });
  }

  const { userId, annee, valeur, ecraserSolde = false, motif } = await req.json();
  const campagne = Number(annee);
  const valeurNumerique = Number(valeur);

  if (!userId || !Number.isInteger(campagne) || valeur === undefined || valeur === "" || !Number.isFinite(valeurNumerique) || !motif || motif.trim().length < 3) {
    return NextResponse.json({ error: "Collaborateur, campagne, valeur et motif (obligatoire) sont requis." }, { status: 400 });
  }

  let ecart = arrondi2(valeurNumerique);
  let valeurCible = null;

  if (ecraserSolde) {
    if (valeurNumerique < 0) {
      return NextResponse.json({ error: "Le solde final voulu ne peut pas être négatif." }, { status: 400 });
    }
    const soldeActuel = await calculerSoldeCP(prisma, userId, new Date());
    const soldesDisponibles = new Map([[soldeActuel.campagne, soldeActuel], [soldeActuel.campagne - 1, soldeActuel.n1]]);
    const soldeCampagne = soldesDisponibles.get(campagne);
    if (!soldeCampagne) {
      return NextResponse.json({ error: `L’écrasement est disponible uniquement pour les campagnes ${soldeActuel.campagne} et ${soldeActuel.campagne - 1}.` }, { status: 400 });
    }
    valeurCible = arrondi2(valeurNumerique);
    ecart = arrondi2(valeurCible - soldeCampagne.disponible);
  }

  const ajustement = await prisma.leaveBalanceAdjustment.create({
    data: {
      userId,
      annee: campagne,
      montant: ecart,
      motif: ecraserSolde ? `${motif.trim()} (solde forcé à ${valeurCible} j)` : motif.trim(),
      createdById: session.user.id,
    },
  });

  const detailAction = ecraserSolde ? `écart ${ecart > 0 ? "+" : ""}${ecart}j — solde forcé à ${valeurCible}j` : `ajustement ${ecart > 0 ? "+" : ""}${ecart}j`;
  await logAudit(session.user.id, "AJUSTEMENT_SOLDE_CREE", `${userId} — campagne ${campagne} — ${detailAction} — ${motif}`);
  await notify(userId, "Ajustement de solde", ecraserSolde ? `Votre solde CP (${campagne}) a été ajusté à ${valeurCible} j : ${motif}` : `Votre solde CP (${campagne}) a reçu un ajustement de ${ecart > 0 ? "+" : ""}${ecart} j : ${motif}`);

  return NextResponse.json(ajustement, { status: 201 });
}

// GET : liste des ajustements (pour affichage admin), filtrable par userId.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const ajustements = await prisma.leaveBalanceAdjustment.findMany({
    where: userId ? { userId } : {},
    include: { user: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(ajustements);
}
