import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET : liste des types de congés (accessible a tous les utilisateurs connectes,
// necessaire pour afficher le planning et le formulaire de demande).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const types = await prisma.leaveType.findMany({ orderBy: { ordre: "asc" } });
  return NextResponse.json(types);
}

// POST : creation d'un nouveau type de conge/statut (admin uniquement) - §6/§4D.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const body = await req.json();
  if (!body.code || !body.libelle || !body.couleur) {
    return NextResponse.json({ error: "Code, libellé et couleur sont obligatoires." }, { status: 400 });
  }

  const created = await prisma.leaveType.create({
    data: {
      code: body.code.trim(),
      libelle: body.libelle.trim(),
      couleur: body.couleur,
      comptabiliseSolde: !!body.comptabiliseSolde,
      demandable: body.demandable !== false,
      plafondAnnuel: body.plafondAnnuel ? Number(body.plafondAnnuel) : null,
      ordre: body.ordre ? Number(body.ordre) : 99,
    },
  });

  await logAudit(session.user.id, "TYPE_CONGE_CREE", created.code);
  return NextResponse.json(created, { status: 201 });
}
