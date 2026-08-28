import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const COMMENTAIRE = "Repas extérieur avec les stagiaires";

// POST : le collaborateur signale lui-même qu'il a mangé à l'extérieur
// aujourd'hui — crée directement une régularisation TR (même mécanisme que
// celle faite manuellement par le gestionnaire TR).
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user.accesRepasExterieur) {
    return NextResponse.json({ error: "Vous n'avez pas accès à cette fonctionnalité." }, { status: 403 });
  }

  const aujourdhui = new Date();
  const jour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());

  if (jour.getDay() === 0 || jour.getDay() === 6) {
    return NextResponse.json({ error: "Pas de ticket restaurant le week-end." }, { status: 400 });
  }

  const existant = await prisma.ticketRestauRegularisation.findUnique({
    where: { userId_date: { userId: session.user.id, date: jour } },
  });
  if (existant) {
    return NextResponse.json({ error: "Déjà signalé pour aujourd'hui." }, { status: 409 });
  }

  await prisma.ticketRestauRegularisation.create({
    data: { userId: session.user.id, date: jour, commentaire: COMMENTAIRE, createdById: session.user.id },
  });

  await logAudit(session.user.id, "REPAS_EXTERIEUR_SIGNALE", jour.toISOString().slice(0, 10));

  return NextResponse.json({ ok: true });
}
