import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { periodeAnnee } from "@/lib/campagneConges";

export const dynamic = "force-dynamic";

// POST : saisie unique du solde de CP restant, à la première connexion.
// Le nombre déclaré devient DIRECTEMENT le solde disponible (0 jour "pris"
// enregistré) — aucune tentative de deviner un écart avec un théorique
// calculé. Le cron mensuel continue ensuite d'ajouter le prorata normal
// (2,5j/mois complet, ou proratisé si arrivée/mois partiel) par-dessus ce
// point de départ.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { joursRestants } = await req.json();
    const restants = Number(joursRestants);
    if (Number.isNaN(restants) || restants < 0) {
      return NextResponse.json({ error: "Merci d'indiquer un nombre de jours valide." }, { status: 400 });
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

    await prisma.$transaction(async (tx) => {
      await tx.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: cp.id, annee: anneeN },
        },
        update: { joursAcquis: restants, joursPris: 0 },
        create: { userId: user.id, leaveTypeId: cp.id, annee: anneeN, joursAcquis: restants, joursPris: 0 },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { soldeInitialSaisi: true },
      });
    });

    await logAudit(user.id, "SOLDE_INITIAL_SAISI", `${restants} j déclarés comme solde disponible`);

    return NextResponse.json({ ok: true, campagne: anneeN, disponible: restants });
  } catch (error) {
    console.error("Erreur solde initial :", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de l'enregistrement du solde initial." }, { status: 500 });
  }
}
