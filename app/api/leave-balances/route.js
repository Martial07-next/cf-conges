import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req) {
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const where = {};

    if (session.user.role === "COLLABORATEUR") {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    const balances =
      await prisma.leaveBalance.findMany({
        where,
        include: {
          leaveType: true,
          user: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              service: true,
            },
          },
        },
        orderBy: [
          {
            user: {
              nom: "asc",
            },
          },
          {
            leaveType: {
              ordre: "asc",
            },
          },
          {
            annee: "desc",
          },
        ],
      });

    const withRestants = balances.map(
      (b) => ({
        ...b,
        joursRestants:
          b.leaveType.comptabiliseSolde
            ? Math.max(
                0,
                b.joursAcquis -
                  b.joursPris
              )
            : null,
      })
    );

    return NextResponse.json(
      withRestants
    );
  } catch (error) {
    console.error(
      "Erreur récupération soldes :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les soldes.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST
 *
 * Modification manuelle d'un solde par l'Admin.
 *
 * Permet notamment de corriger :
 * - N
 * - N-1
 * - un solde provenant d'une fiche de paie
 */
export async function POST(req) {
  try {
    const session =
      await getServerSession(authOptions);

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
      annee,
      joursAcquis,
      joursPris,
    } = body;

    if (
      !userId ||
      !leaveTypeId ||
      annee === undefined ||
      annee === null
    ) {
      return NextResponse.json(
        {
          error:
            "Utilisateur, type de congé et année obligatoires.",
        },
        { status: 400 }
      );
    }

    const acquis =
      Number(joursAcquis) || 0;

    const pris =
      Number(joursPris) || 0;

    if (acquis < 0 || pris < 0) {
      return NextResponse.json(
        {
          error:
            "Les valeurs ne peuvent pas être négatives.",
        },
        { status: 400 }
      );
    }

    const balance =
      await prisma.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_annee: {
            userId,
            leaveTypeId,
            annee: Number(annee),
          },
        },
        update: {
          joursAcquis: acquis,
          joursPris: pris,
        },
        create: {
          userId,
          leaveTypeId,
          annee: Number(annee),
          joursAcquis: acquis,
          joursPris: pris,
        },
        include: {
          leaveType: true,
        },
      });

    await logAudit(
      session.user.id,
      "SOLDE_MODIFIE_ADMIN",
      `${userId} — ${leaveTypeId} — ${annee}`
    );

    return NextResponse.json({
      ...balance,
      joursRestants:
        balance.leaveType
          .comptabiliseSolde
          ? Math.max(
              0,
              balance.joursAcquis -
                balance.joursPris
            )
          : null,
    });
  } catch (error) {
    console.error(
      "Erreur modification solde :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de modifier le solde.",
      },
      { status: 500 }
    );
  }
}
