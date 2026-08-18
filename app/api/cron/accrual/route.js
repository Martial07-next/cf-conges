import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const JOURS_PAR_MOIS = 2.5;

function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  // Période d'acquisition : mai -> avril
  return m >= 5 ? y : y - 1;
}

function debutMois(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function moisEcoulesDepuis(dateEntree, dateReference) {
  const entree = debutMois(new Date(dateEntree));
  const reference = debutMois(new Date(dateReference));

  return (
    (reference.getFullYear() - entree.getFullYear()) * 12 +
    (reference.getMonth() - entree.getMonth())
  );
}

// GET : appelée par Vercel Cron le 1er de chaque mois.
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");

    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const now = new Date();

    const cleMois = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    const dejaExecute =
      await prisma.accrualRun.findUnique({
        where: {
          moisAnnee: cleMois,
        },
      });

    if (dejaExecute) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: `Acquisition déjà effectuée pour ${cleMois}.`,
      });
    }

    const annee = periodeAnnee(now);

    const cp = await prisma.leaveType.findUnique({
      where: {
        code: "CP",
      },
    });

    if (!cp) {
      return NextResponse.json(
        {
          error: "Type de congé CP introuvable.",
        },
        { status: 500 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        statutCompte: "ACTIF",
        dateEntree: {
          not: null,
        },
      },
    });

    let count = 0;

    for (const user of users) {
      const dateEntree = new Date(user.dateEntree);

      // Un salarié ne peut pas acquérir de CP avant
      // son mois d'entrée dans l'entreprise.
      const moisEcoules = moisEcoulesDepuis(
        dateEntree,
        now
      );

      if (moisEcoules < 0) {
        continue;
      }

      /*
       * On récupère le solde de la période actuelle.
       */
      const balance =
        await prisma.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_annee: {
              userId: user.id,
              leaveTypeId: cp.id,
              annee,
            },
          },
        });

      /*
       * Si le salarié n'a pas encore de balance,
       * on la crée avec 2,5 jours pour ce mois.
       */
      if (!balance) {
        await prisma.leaveBalance.create({
          data: {
            userId: user.id,
            leaveTypeId: cp.id,
            annee,
            joursAcquis: JOURS_PAR_MOIS,
            joursPris: 0,
          },
        });

        count++;
        continue;
      }

      /*
       * Si une balance existe déjà, on ajoute
       * simplement les 2,5 jours du mois.
       */
      await prisma.leaveBalance.update({
        where: {
          id: balance.id,
        },
        data: {
          joursAcquis: {
            increment: JOURS_PAR_MOIS,
          },
        },
      });

      count++;
    }

    await prisma.accrualRun.create({
      data: {
        moisAnnee: cleMois,
        nombreComptes: count,
      },
    });

    await logAudit(
      null,
      "ACQUISITION_CP_MENSUELLE",
      `${cleMois} — ${count} comptes crédités de ${JOURS_PAR_MOIS}j (période ${annee})`
    );

    return NextResponse.json({
      ok: true,
      moisAnnee: cleMois,
      periode: annee,
      comptesCredites: count,
    });
  } catch (error) {
    console.error(
      "Erreur cron acquisition CP :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur lors de l'acquisition mensuelle des CP.",
      },
      { status: 500 }
    );
  }
}
