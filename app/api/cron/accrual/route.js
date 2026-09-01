import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const JOURS_PAR_MOIS = 2.5;
const PLAFOND_ANNUEL = 30;

/**
 * Campagne de congés :
 * 01/06/2026 -> 31/05/2027 = campagne 2026
 */
function periodeAnnee(date) {
  const annee = date.getFullYear();
  const mois = date.getMonth() + 1;

  return mois >= 6 ? annee : annee - 1;
}

function debutMois(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

/**
 * Nombre de mois d'acquisition depuis l'entrée.
 *
 * Exemple :
 * entrée le 15/03/2026
 * Cron du 01/06/2026
 * => mars -> juin = 3 mois
 *
 * Le calcul est plafonné à 12 mois dans la campagne.
 */
function nombreMoisDepuis(dateEntree, dateReference) {
  const entree = debutMois(new Date(dateEntree));
  const reference = debutMois(new Date(dateReference));

  return (
    (reference.getFullYear() - entree.getFullYear()) * 12 +
    (reference.getMonth() - entree.getMonth())
  );
}

/**
 * Nombre de mois déjà écoulés dans la campagne actuelle.
 *
 * Juin = 1
 * Juillet = 2
 * Août = 3
 * etc.
 */
function moisEcoulesCampagne(date) {
  const campagne = periodeAnnee(date);

  const debutCampagne = new Date(campagne, 5, 1);

  return Math.max(
    0,
    Math.min(
      12,
      (date.getFullYear() - debutCampagne.getFullYear()) * 12 +
        (date.getMonth() - debutCampagne.getMonth()) +
        1
    )
  );
}

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

    const dejaExecute = await prisma.accrualRun.findUnique({
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

      if (dateEntree > now) {
        continue;
      }

      /**
       * Si la personne est entrée avant le début de la campagne,
       * elle peut acquérir jusqu'à 30 jours.
       *
       * Si elle est entrée pendant la campagne,
       * on ne lui attribue que les mois réellement écoulés.
       */
      const debutCampagne = new Date(annee, 5, 1);
      const debutAcquisition =
        dateEntree > debutCampagne
          ? debutMois(dateEntree)
          : debutCampagne;

      const moisDepuisEntree = nombreMoisDepuis(
        debutAcquisition,
        now
      );

      if (moisDepuisEntree < 0) {
        continue;
      }

      const moisAcquis = Math.min(
        12,
        moisDepuisEntree + 1
      );

      const joursTheoriques = Math.min(
        PLAFOND_ANNUEL,
        moisAcquis * JOURS_PAR_MOIS
      );

      const balance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_annee: {
            userId: user.id,
            leaveTypeId: cp.id,
            annee,
          },
        },
      });

      if (!balance) {
        await prisma.leaveBalance.create({
          data: {
            userId: user.id,
            leaveTypeId: cp.id,
            annee,
            joursAcquis: joursTheoriques,
            joursPris: 0,
          },
        });

        count++;
        continue;
      }

      /**
       * Ne jamais retirer de jours acquis.
       *
       * On corrige uniquement si le solde acquis est inférieur
       * à ce qu'il devrait être à ce stade de la campagne.
       *
       * Cela évite de doubler un solde initial déjà renseigné.
       */
      if (balance.joursAcquis < joursTheoriques) {
        await prisma.leaveBalance.update({
          where: {
            id: balance.id,
          },
          data: {
            joursAcquis: Math.min(
              PLAFOND_ANNUEL,
              joursTheoriques
            ),
          },
        });
      }

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
      `${cleMois} — ${count} comptes traités`
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
