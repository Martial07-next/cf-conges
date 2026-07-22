import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(req, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });

  const body = await req.json();
  const updated = await prisma.leaveType.update({
    where: { id: params.id },
    data: {
      libelle: body.libelle,
      couleur: body.couleur,
      comptabiliseSolde: body.comptabiliseSolde,
      demandable: body.demandable,
      plafondAnnuel: body.plafondAnnuel ? Number(body.plafondAnnuel) : null,
    },
  });

  await logAudit(session.user.id, "TYPE_CONGE_MODIFIE", updated.code);
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });

  const type = await prisma.leaveType.findUnique({ where: { id: params.id } });
  await prisma.leaveType.delete({ where: { id: params.id } });
  await logAudit(session.user.id, "TYPE_CONGE_SUPPRIME", type?.code);

  return NextResponse.json({ ok: true });
}
