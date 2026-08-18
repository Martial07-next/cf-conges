import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  // Période d'acquisition : mai -> avril
  return m >= 5 ? y : y - 1;
}

// POST : saisie du solde de CP restant actuellement.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    const { joursRestants } = await req.json();

    const restants = Number(joursRestants);

    if (!Number.isFinite(restants) || restants < 0) {
      return NextResponse.json(
        {
          error:
            "Merci d'indiquer un nombre de jours valide.",
        },
        { status: 400 }
      );
    }

    const cp = await prisma.leaveType.findUnique({
      where: { code: "CP" },
    });

    if (!cp) {
      return NextResponse.json(
        {
          error: "Type de congé CP introuvable.",
        },
        { status: 500 }
      );
    }

    const annee = periodeAnnee(new Date());

    const existant =
      await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_annee: {
            userId: session.user.id,
            leaveTypeId: cp.id,
            annee,
          },
        },
      });

    /*
     * Le nombre saisi correspond au SOLDE ACTUEL
     * indiqué sur la fiche de paie.
     *
     * Exemple :
     * - fiche de paie : 2,5 jours restants
     * - joursAcquis : 2,5
     * - joursPris : 0
     * - solde affiché : 2,5
     *
     * On ne doit donc pas calculer :
     * 0 - 2,5 = -2,5 => 0
     */

    if (existant) {
      const soldeActuel = Math.max(
        0,
        existant.joursAcquis - existant.joursPris
      );

      const difference = restants - soldeActuel;

      if (difference >= 0) {
        await prisma.leaveBalance.update({
          where: { id: existant.id },
          data: {
            joursAcquis: {
              increment: difference,
            },
          },
        });
      } else {
        await prisma.leaveBalance.update({
          where: { id: existant.id },
          data: {
            joursPris: {
              increment: Math.abs(difference),
            },
          },
        });
      }
    } else {
      await prisma.leaveBalance.create({
        data: {
          userId: session.user.id,
          leaveTypeId: cp.id,
          annee,
          joursAcquis: restants,
          joursPris: 0,
        },
      });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        soldeInitialSaisi: true,
      },
    });

    await logAudit(
      session.user.id,
      "SOLDE_INITIAL_SAISI",
      `${restants} j restants déclarés`
    );

    return NextResponse.json({
      ok: true,
      joursRestants: restants,
    });
  } catch (error) {
    console.error(
      "Erreur API /api/profil/solde-initial :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors de l'enregistrement du solde initial.",
      },
      { status: 500 }
    );
  }
}
