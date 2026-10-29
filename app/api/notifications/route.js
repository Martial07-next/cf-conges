import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  // ?compte=1 : seulement le nombre de non lues (pastille du menu).
  if (new URL(req.url).searchParams.get("compte") === "1") {
    const nonLues = await prisma.notification.count({ where: { userId: session.user.id, lu: false } });
    return NextResponse.json({ nonLues });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

// DELETE : vide entièrement la table des notifications (admin uniquement).
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }
  await prisma.notification.deleteMany({});
  return NextResponse.json({ ok: true });
}
