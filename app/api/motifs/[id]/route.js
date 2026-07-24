import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.leaveTypeMotif.update({
    where: { id: params.id },
    data: { libelle: body.libelle, jours: body.jours ? Number(body.jours) : undefined },
  });

  await logAudit(session.user.id, "MOTIF_MODIFIE", updated.libelle);
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const motif = await prisma.leaveTypeMotif.findUnique({ where: { id: params.id } });
  await prisma.leaveTypeMotif.delete({ where: { id: params.id } });
  await logAudit(session.user.id, "MOTIF_SUPPRIME", motif?.libelle);

  return NextResponse.json({ ok: true });
}
