import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const JOURS_PAR_MOIS = 2.5;
const PLAFOND_ANNUEL = 30;

function periodeAnnee(date) {
  const annee = date.getFullYear();
  const mois = date.getMonth() + 1;

  // Période d'acquisition : mai → avril
  // Mai 2026 à avril 2027 = période 2026
  return mois >= 5 ? annee : annee - 1;
}

function debutMois(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function nombreMoisDepuis(dateEntree, dateReference) {
  const entree = debutMois(new Date(dateEntree));
  const reference = debutMois(new Date(dateReference));

  return (
    (reference.getFullYear() - entree.getFullYear()) * 12 +
    (reference.getMonth() - entree.getMonth())
  );
}

export async function GET(req) {
  try {
    // Protection Vercel Cron
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

    // Identifiant unique du mois
    const cleMois = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    // Empêche une double exécution dans le même mois
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

    // Recherche du type CP
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

    // On ne prend que les comptes actifs
    // ayant une date d'entrée renseignée.
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

      // Si la date d'entrée est dans le futur,
      // aucun CP ne doit être attribué.
      if (dateEntree > now) {
        continue;
      }

      // Nombre de mois depuis l'entrée
      const moisDepuisEntree = nombreMoisDepuis(
        dateEntree,
        now
      );

      if (moisDepuisEntree < 0) {
        continue;
      }

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

      // Si aucun solde n'existe encore :
      // on crée le solde avec 2,5 jours.
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

      // Ne jamais dépasser 30 jours acquis
      // sur une période.
      if (balance.joursAcquis >= PLAFOND_ANNUEL) {
        continue;
      }

      const nouveauSolde = Math.min(
        PLAFOND_ANNUEL,
        balance.joursAcquis + JOURS_PAR_MOIS
      );

      await prisma.leaveBalance.update({
        where: {
          id: balance.id,
        },
        data: {
          joursAcquis: nouveauSolde,
        },
      });

      count++;
    }

    // Enregistre l'exécution du cron
    await prisma.accrualRun.create({
      data: {
        moisAnnee: cleMois,
        nombreComptes: count,
      },
    });

    await logAudit(
      null,
      "ACQUISITION_CP_MENSUELLE",
      `${cleMois} — ${count} comptes crédités de ${JOURS_PAR_MOIS}j`
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
