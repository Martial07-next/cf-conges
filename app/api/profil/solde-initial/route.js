import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { periodeAnnee, joursAcquisDepuisDebutCampagne } from "@/lib/campagneConges";

export const dynamic = "force-dynamic";

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

      if (joursN1 > 0) {
        await tx.leaveBalance.upsert({
          where: {
            userId_leaveTypeId_annee: {
              userId: user.id,
              leaveTypeId: cp.id,
              annee: anneeN1,
            },
          },
          update: {
            joursAcquis: joursN1,
            joursPris: 0,
          },
          create: {
            userId: user.id,
            leaveTypeId: cp.id,
            annee: anneeN1,
            joursAcquis: joursN1,
            joursPris: 0,
          },
        });
      }

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
      `${restants} j déclarés — N acquis: ${acquisN} j, pris: ${joursPrisN} j — N-1: ${joursN1} j`
    );

    return NextResponse.json({
      ok: true,
      campagne: anneeN,
      n: acquisN - joursPrisN,
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
