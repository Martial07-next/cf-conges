import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const JOURS_PAR_MOIS = 2.5;
const PLAFOND_ANNUEL = 30;

/**
 * Juin -> mai
 *
 * Juin 2026 = campagne 2026
 * Mai 2027 = campagne 2026
 */
function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  return m >= 6 ? y : y - 1;
}

/**
 * Nombre de mois acquis depuis le début de la campagne.
 *
 * Exemple au 01/09/2026 :
 * juin + juillet + août = 3 mois
 * => 7,5 jours
 */
function joursAcquisDepuisDebutCampagne(date, dateEntree) {
  const campagne = periodeAnnee(date);

  const debutCampagne = new Date(
    campagne,
    5,
    1
  );

  const entree = new Date(dateEntree);

  const debutEffectif =
    entree > debutCampagne
      ? new Date(
          entree.getFullYear(),
          entree.getMonth(),
          1
        )
      : debutCampagne;

  const reference = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

  const mois =
    (reference.getFullYear() -
      debutEffectif.getFullYear()) *
      12 +
    (reference.getMonth() -
      debutEffectif.getMonth()) +
    1;

  return Math.max(
    0,
    Math.min(
      PLAFOND_ANNUEL,
      mois * JOURS_PAR_MOIS
    )
  );
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          error: "Non authentifié.",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Utilisateur introuvable.",
        },
        { status: 404 }
      );
    }

    /**
     * Une configuration initiale ne doit être faite qu'une fois.
     */
    if (user.soldeInitialSaisi) {
      return NextResponse.json(
        {
          error:
            "Le solde initial a déjà été configuré.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const restants = Number(body.joursRestants);

    if (
      Number.isNaN(restants) ||
      restants < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Merci d'indiquer un nombre de jours valide.",
        },
        { status: 400 }
      );
    }

    const cp = await prisma.leaveType.findUnique({
      where: {
        code: "CP",
      },
    });

    if (!cp) {
      return NextResponse.json(
        {
          error:
            "Type de congé CP introuvable.",
        },
        { status: 500 }
      );
    }

    const now = new Date();

    /**
     * Si aucune date d'entrée n'est encore renseignée,
     * on utilise le début de la campagne actuelle.
     */
    const dateEntree = user.dateEntree
      ? new Date(user.dateEntree)
      : new Date(
          periodeAnnee(now),
          5,
          1
        );

    const anneeN = periodeAnnee(now);
    const anneeN1 = anneeN - 1;

    /**
     * Exemple :
     *
     * Solde fiche de paie = 15 j
     * Juin + juillet + août = 7,5 j acquis en N
     *
     * N  = 7,5
     * N-1 = 7,5
     *
     * IMPORTANT :
     * les congés déjà posés ne sont pas relus ici.
     * Le solde de fiche de paie est considéré comme
     * un solde déjà net de ces congés.
     */
        const acquisN = joursAcquisDepuisDebutCampagne(
      now,
      dateEntree
    );

    // Important : on ne baisse JAMAIS la valeur reellement acquise sur N,
    // meme si le solde declare est inferieur (ca corromprait les mois
    // d'acquisition suivants, qui s'ajoutent par increment). On ajuste
    // uniquement "joursPris" pour refleter un eventuel ecart.
    const joursPrisN = Math.max(
      0,
      acquisN - restants
    );

    const joursN1 = Math.max(
      0,
      restants - acquisN
    );

    /**
     * On crée / remplace uniquement les soldes.
     *
     * On ne modifie aucune LeaveRequest.
     */
    await prisma.$transaction(async (tx) => {
      await tx.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_annee: {
            userId: user.id,
            leaveTypeId: cp.id,
            annee: anneeN,
          },
        },
        update: {
          joursAcquis: joursN,
          joursPris: 0,
        },
        create: {
          userId: user.id,
          leaveTypeId: cp.id,
          annee: anneeN,
          joursAcquis: joursN,
          joursPris: 0,
        },
      });

            await tx.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_annee: {
            userId: user.id,
            leaveTypeId: cp.id,
            annee: anneeN,
          },
        },
        update: {
          joursAcquis: acquisN,
          joursPris: joursPrisN,
        },
        create: {
          userId: user.id,
          leaveTypeId: cp.id,
          annee: anneeN,
          joursAcquis: acquisN,
          joursPris: joursPrisN,
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          soldeInitialSaisi: true,
        },
      });
    });

    await logAudit(
      user.id,
      "SOLDE_INITIAL_SAISI",
      `${restants} j déclarés — N: ${joursN} j — N-1: ${joursN1} j`
    );

    return NextResponse.json({
      ok: true,
      campagne: anneeN,
      n: joursN,
      n1: joursN1,
      total: restants,
    });
  } catch (error) {
    console.error(
      "Erreur solde initial :",
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
