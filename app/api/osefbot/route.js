import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { repondreOSEFBOT, navigationOSEFBOT } from "@/lib/osefbot";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { message } = await req.json().catch(() => ({}));
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Question vide." }, { status: 400 });
  }
  if (message.length > 600) {
    return NextResponse.json({ error: "Question trop longue." }, { status: 400 });
  }

  try {
    const reponse = await repondreOSEFBOT({ prisma, userId: session.user.id, message });
    const navigation = await navigationOSEFBOT(message, prisma);
    const connaissanceUtilisee = await prisma.osefBotKnowledge.findFirst({
      where: { actif: true, reponse },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    }).catch(() => null);

    // Une requête bloquée pour des secrets ou identifiants ne devient jamais
    // une donnée d'amélioration d'OSEFBOT.
    if (reponse.startsWith("Je ne peux pas révéler de mots de passe")) {
      return NextResponse.json({ reponse, interactionId: null, navigation: null });
    }

    // Le feedback est secondaire : une erreur de persistance ne doit jamais
    // empêcher OSEFBOT de répondre au collaborateur.
    let interactionId = null;
    try {
      const interaction = await prisma.osefBotFeedback.create({
        data: {
          userId: session.user.id,
          question: message.trim(),
          reponse,
          knowledgeId: connaissanceUtilisee?.id || null,
        },
        select: { id: true },
      });
      interactionId = interaction.id;
    } catch (feedbackError) {
      console.error("OSEFBOT feedback:", feedbackError);
    }

    return NextResponse.json({ reponse, interactionId, navigation });
  } catch (error) {
    console.error("OSEFBOT:", error);
    return NextResponse.json({ error: "OSEFBOT rencontre un problème temporaire." }, { status: 500 });
  }
}
