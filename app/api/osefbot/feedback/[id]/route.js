import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { utile, commentaire } = await req.json().catch(() => ({}));
  if (typeof utile !== "boolean") {
    return NextResponse.json({ error: "Feedback invalide." }, { status: 400 });
  }

  const interaction = await prisma.osefBotFeedback.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });
  if (!interaction) return NextResponse.json({ error: "Interaction introuvable." }, { status: 404 });

  const texte = typeof commentaire === "string" ? commentaire.trim().slice(0, 500) : null;
  await prisma.osefBotFeedback.update({
    where: { id: interaction.id },
    data: { utile, commentaire: texte || null, ratedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
