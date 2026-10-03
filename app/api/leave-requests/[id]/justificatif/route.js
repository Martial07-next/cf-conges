import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createPrivateSignedUrl } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const request = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    select: {
      userId: true,
      pieceJointeNom: true,
      pieceJointePath: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const estProprietaire = request.userId === session.user.id;
  const estValideur = canAccess(session.user, "employeur");
  if (!estProprietaire && !estValideur) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (!request.pieceJointePath) {
    return NextResponse.json({ error: "Aucun justificatif pour cette demande." }, { status: 404 });
  }

  try {
    const url = await createPrivateSignedUrl("justificatifs", request.pieceJointePath, 300);
    return NextResponse.json({
      url,
      nom: request.pieceJointeNom || "justificatif",
      expiresIn: 300,
    });
  } catch (error) {
    console.error("Lecture justificatif:", error);
    return NextResponse.json({ error: "Impossible d'ouvrir le justificatif." }, { status: 500 });
  }
}
