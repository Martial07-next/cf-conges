import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET : liste des motifs a duree fixe (utilise par le formulaire de demande, tous roles).
// Filtrable par ?leaveTypeId=
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leaveTypeId = searchParams.get("leaveTypeId");

  const motifs = await prisma.leaveTypeMotif.findMany({
    where: leaveTypeId ? { leaveTypeId } : {},
    orderBy: { ordre: "asc" },
  });
  return NextResponse.json(motifs);
}

// POST : creation d'un motif a duree fixe (admin uniquement).
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const body = await req.json();
  if (!body.leaveTypeId || !body.libelle || !body.jours) {
    return NextResponse.json({ error: "Type de congé, libellé et nombre de jours obligatoires." }, { status: 400 });
  }

  const created = await prisma.leaveTypeMotif.create({
    data: {
      leaveTypeId: body.leaveTypeId,
      libelle: body.libelle.trim(),
      jours: Number(body.jours),
      ordre: body.ordre ? Number(body.ordre) : 99,
    },
  });

  await logAudit(session.user.id, "MOTIF_CREE", created.libelle);
  return NextResponse.json(created, { status: 201 });
}
