import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET : journal d'audit (§4D) - reserve a l'administrateur.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { nom: true, prenom: true, email: true } } },
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json(logs);
}

// DELETE : vide entièrement le journal d'audit (admin uniquement).
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }
  await prisma.auditLog.deleteMany({});
  return NextResponse.json({ ok: true });
}
