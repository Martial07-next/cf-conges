import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { repondreOSEFBOT } from "@/lib/osefbot";

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
    const interaction = await prisma.osefBotFeedback.create({
      data: {
        userId: session.user.id,
        question: message.trim(),
        reponse,
      },
      select: { id: true },
    });
    return NextResponse.json({ reponse, interactionId: interaction.id });
  } catch (error) {
    console.error("OSEFBOT:", error);
    return NextResponse.json({ error: "OSEFBOT rencontre un problème temporaire." }, { status: 500 });
  }
}
