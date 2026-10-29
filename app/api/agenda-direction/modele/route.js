import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estDirection, STATUTS_AGENDA } from "@/lib/agendaDirection";

export const dynamic = "force-dynamic";

const PERIODES_VALIDES = ["MATIN", "APREM"];

// PUT { entrees: [{ jour: 1..5, periode, statut | null, lieu?, note? }] }
// Enregistre la semaine type de la personne connectée. Un statut vide
// efface la demi-journée de la semaine type.
export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!estDirection(session.user)) {
    return NextResponse.json({ error: "Réservé aux Employeurs / RH et au pôle Direction." }, { status: 403 });
  }

  const { entrees } = await req.json().catch(() => ({}));
  if (!Array.isArray(entrees) || entrees.length === 0 || entrees.length > 10) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const operations = [];
  for (const e of entrees) {
    if (!Number.isInteger(e?.jour) || e.jour < 1 || e.jour > 5 || !PERIODES_VALIDES.includes(e.periode)) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    if (!e.statut) {
      operations.push(prisma.agendaDirectionModele.deleteMany({ where: { userId: session.user.id, jour: e.jour, periode: e.periode } }));
      continue;
    }
    const statut = STATUTS_AGENDA[e.statut];
    if (!statut) return NextResponse.json({ error: "Statut inconnu." }, { status: 400 });
    const lieu = statut.avecLieu && typeof e.lieu === "string" ? e.lieu.trim().slice(0, 80) || null : null;
    const note = typeof e.note === "string" ? e.note.trim().slice(0, 200) || null : null;
    operations.push(
      prisma.agendaDirectionModele.upsert({
        where: { userId_jour_periode: { userId: session.user.id, jour: e.jour, periode: e.periode } },
        update: { statut: e.statut, lieu, note },
        create: { userId: session.user.id, jour: e.jour, periode: e.periode, statut: e.statut, lieu, note },
      })
    );
  }

  await prisma.$transaction(operations);
  return NextResponse.json({ ok: true });
}
