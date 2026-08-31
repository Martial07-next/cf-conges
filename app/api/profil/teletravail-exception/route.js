import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST : ajoute une période pendant laquelle le télétravail est désactivé.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    const { du, au } = await req.json();

    if (!du || !au) {
      return NextResponse.json(
        {
          error:
            "Dates de début et de fin obligatoires.",
        },
        { status: 400 }
      );
    }

    const debut = new Date(`${du}T00:00:00`);
    const fin = new Date(`${au}T00:00:00`);

    if (
      Number.isNaN(debut.getTime()) ||
      Number.isNaN(fin.getTime())
    ) {
      return NextResponse.json(
        { error: "Dates invalides." },
        { status: 400 }
      );
    }

    if (debut > fin) {
      return NextResponse.json(
        {
          error:
            "La date de début doit être antérieure ou égale à la date de fin.",
        },
        { status: 400 }
      );
    }

    const dates = [];

    const date = new Date(debut);

    while (date <= fin) {
      dates.push(new Date(date));

      date.setDate(date.getDate() + 1);
    }

    await prisma.teletravailException.createMany({
      data: dates.map((date) => ({
        userId: session.user.id,
        date,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      jours: dates.length,
    });
  } catch (error) {
    console.error(
      "Erreur ajout exception télétravail:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d'enregistrer l'exception de télétravail.",
      },
      { status: 500 }
    );
  }
}
