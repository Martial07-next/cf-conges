import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Non authentifié.",
        },
        {
          status: 401,
        }
      );
    }

    const body = await req.json();

    const { dateEntree } = body;

    if (!dateEntree) {
      return NextResponse.json(
        {
          error:
            "Merci d'indiquer une date d'entrée.",
        },
        {
          status: 400,
        }
      );
    }

    const date = new Date(dateEntree);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        {
          error:
            "La date d'entrée renseignée est invalide.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Empêche une date d'entrée située dans le futur.
     */
    const aujourdHui = new Date();

    aujourdHui.setHours(23, 59, 59, 999);

    if (date > aujourdHui) {
      return NextResponse.json(
        {
          error:
            "La date d'entrée ne peut pas être dans le futur.",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.user.update({
      where: {
        id: session.user.id,
      },

      data: {
        dateEntree: date,
      },
    });

    await logAudit(
      session.user.id,
      "DATE_ENTREE_MODIFIEE",
      `Date d'entrée : ${dateEntree}`
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "Erreur API date d'entrée :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors de l'enregistrement de la date d'entrée.",
      },
      {
        status: 500,
      }
    );
  }
}
