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

  const pieceId = new URL(req.url).searchParams.get("pieceId");

  const request = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    select: {
      userId: true,
      pieceJointeNom: true,
      pieceJointePath: true,
      piecesJointes: { select: { id: true, nom: true, path: true } },
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

  const piece = pieceId
    ? request.piecesJointes.find((item) => item.id === pieceId)
    : request.piecesJointes[0] || (request.pieceJointePath
        ? { nom: request.pieceJointeNom, path: request.pieceJointePath }
        : null);

  if (!piece) {
    return NextResponse.json({ error: "Justificatif introuvable pour cette demande." }, { status: 404 });
  }

  try {
    const url = await createPrivateSignedUrl("justificatifs", piece.path, 300);
    return NextResponse.json({
      url,
      nom: piece.nom || "justificatif",
      expiresIn: 300,
    });
  } catch (error) {
    console.error("Lecture justificatif:", error);
    return NextResponse.json({ error: "Impossible d'ouvrir le justificatif." }, { status: 500 });
  }
}
