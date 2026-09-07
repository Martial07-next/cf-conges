import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { periodeAnnee, joursAcquisDepuisDebutCampagne, arrondi2 } from "@/lib/campagneConges";

export const dynamic = "force-dynamic";

// POST : le collaborateur confirme sa date d'entree a la premiere connexion.
// Le solde de CP se calcule ENTIEREMENT tout seul a partir de cette date
// (prorata du mois d'arrivee + mois complets ecoules depuis) - aucune
// saisie de solde n'est demandee.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { dateEntree } = await req.json();
    if (!dateEntree) {
      return NextResponse.json({ error: "Merci d'indiquer votre date d'entrée." }, { status: 400 });
    }

    const dateEntreeParsed = new Date(dateEntree);
    if (Number.isNaN(dateEntreeParsed.getTime()) || dateEntreeParsed > new Date()) {
      return NextResponse.json({ error: "Date d'entrée invalide." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const cp = await prisma.leaveType.findUnique({ where: { code: "CP" } });
    if (!cp) {
      return NextResponse.json({ error: "Type de congé CP introuvable." }, { status: 500 });
    }

    const anneeN = periodeAnnee(new Date());
    const acquisAutomatique = arrondi2(joursAcquisDepuisDebutCampagne(new Date(), dateEntreeParsed));

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { dateEntree: dateEntreeParsed, soldeInitialSaisi: true },
      });

      await tx.leaveBalance.upsert({
        where: { userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: cp.id, annee: anneeN } },
        update: { joursAcquis: acquisAutomatique, joursPris: 0 },
        create: { userId: user.id, leaveTypeId: cp.id, annee: anneeN, joursAcquis: acquisAutomatique, joursPris: 0 },
      });
    });

    await logAudit(user.id, "DATE_ENTREE_CONFIRMEE", `${dateEntree} — solde CP calculé automatiquement : ${acquisAutomatique.toFixed(2)} j`);

    return NextResponse.json({ ok: true, acquis: acquisAutomatique });
  } catch (error) {
    console.error("Erreur confirmation date d'entrée :", error);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
