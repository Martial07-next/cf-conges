import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// DELETE : l'alternant retire une période école (le rythme a changé).
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const entry = await prisma.leaveRequest.findUnique({ where: { id: params.id } });
  if (!entry || entry.userId !== session.user.id || !entry.gereParAlternant) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  await prisma.leaveRequest.delete({ where: { id: params.id } });
  await logAudit(session.user.id, "ECOLE_SUPPRIMEE", entry.id);
  return NextResponse.json({ ok: true });
}
