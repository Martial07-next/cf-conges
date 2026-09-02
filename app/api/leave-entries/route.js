import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Campagne de congés :
 * 01/06/2026 -> 31/05/2027 = 2026
 */
function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  return m >= 6 ? y : y - 1;
}

function calculerJours(
  debut,
  fin,
  demiJournee
) {
  const joursCalendaires =
    Math.max(
      1,
      Math.round(
        (fin - debut) /
          (1000 * 60 * 60 * 24)
      ) + 1
    );

  return (
    joursCalendaires *
    (demiJournee ? 0.5 : 1)
  );
}

export async function POST(req) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !canAccess(
        session?.user,
        "admin"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Réservé à l'administrateur.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      userId,
      leaveTypeId,
      dateDebut,
      dateFin,
      demiJournee,
      demiJourneePeriode,
      motif,
    } = body;

    if (
      !userId ||
      !leaveTypeId ||
      !dateDebut ||
      !dateFin
    ) {
      return NextResponse.json(
        {
          error:
            "Collaborateur, type de congé et dates obligatoires.",
        },
        { status: 400 }
      );
    }

    const debut = new Date(
      dateDebut
    );

    const fin = new Date(
      dateFin
    );

    if (
      Number.isNaN(debut.getTime()) ||
      Number.isNaN(fin.getTime())
    ) {
      return NextResponse.json(
        {
          error:
            "Les dates fournies sont invalides.",
        },
        { status: 400 }
      );
    }

    if (fin < debut) {
      return NextResponse.json(
        {
          error:
            "La date de fin doit être postérieure à la date de début.",
        },
        { status: 400 }
      );
    }

    const leaveType =
      await prisma.leaveType.findUnique(
        {
          where: {
            id: leaveTypeId,
          },
        }
      );

    if (!leaveType) {
      return NextResponse.json(
        {
          error:
            "Type de congé introuvable.",
        },
        { status: 400 }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const request =
            await tx.leaveRequest.create(
              {
                data: {
                  userId,
                  leaveTypeId,
                  dateDebut: debut,
                  dateFin: fin,
                  demiJournee:
                    !!demiJournee,
                  demiJourneePeriode:
                    demiJournee
                      ? demiJourneePeriode ||
                        null
                      : null,
                  motif:
                    motif ||
                    "Ajouté manuellement par l'administrateur",
                  statut: "VALIDE",
                  valideParId:
                    session.user.id,
                  dateValidation:
                    new Date(),
                  creeParAdmin: true,
                },
                include: {
                  leaveType: true,
                  user: true,
                },
              }
            );

          if (
            leaveType.comptabiliseSolde
          ) {
            const annee =
              periodeAnnee(
                debut
              );

            const jours =
              calculerJours(
                debut,
                fin,
                !!demiJournee
              );

            await tx.leaveBalance.upsert(
              {
                where: {
                  userId_leaveTypeId_annee:
                    {
                      userId,
                      leaveTypeId,
                      annee,
                    },
                },

                update: {
                  joursPris: {
                    increment: jours,
                  },
                },

                create: {
                  userId,
                  leaveTypeId,
                  annee,
                  joursAcquis:
                    leaveType.plafondAnnuel ||
                    0,
                  joursPris: jours,
                },
              }
            );
          }

          return request;
        }
      );

    await logAudit(
      session.user.id,
      "CONGE_AJOUTE_ADMIN",
      `${result.user.prenom} ${result.user.nom} — ${leaveType.code} du ${dateDebut} au ${dateFin}`
    );

    return NextResponse.json(
      result,
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Erreur ajout congé admin :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d'ajouter le congé.",
      },
      { status: 500 }
    );
  }
}
