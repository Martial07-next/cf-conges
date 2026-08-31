import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE : retire une exception de télétravail.
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    const exception = 
      await prisma.teletravailOverride.findUnique({
        where: {
          id: params.id,
        },
      });

    if (!exception) {
      return NextResponse.json(
        {
          error:
            "Exception de télétravail introuvable.",
        },
        { status: 404 }
      );
    }

    const isAdmin =
      session.user.role === "ADMIN";

    const isOwner =
      exception.userId === session.user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error:
            "Vous n'avez pas l'autorisation de retirer ce télétravail.",
        },
        { status: 403 }
      );
    }

    await prisma.teletravailOverride.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "Erreur suppression exception télétravail:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de retirer le télétravail.",
      },
      { status: 500 }
    );
  }
}
