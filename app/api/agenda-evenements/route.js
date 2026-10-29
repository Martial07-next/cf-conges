import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estDirection, STATUTS_AGENDA } from "@/lib/agendaDirection";

export const dynamic = "force-dynamic";

function dateISO(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : null;
}

// POST { statut, dateDebut, dateFin?, demiJournee?, periode?, lieu?, note? }
// Ajoute une exception à l'agenda de la personne connectée.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!estDirection(session.user)) {
    return NextResponse.json({ error: "Réservé aux Employeurs / RH et au pôle Direction." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const statut = STATUTS_AGENDA[body.statut];
  const debut = dateISO(body.dateDebut);
  const fin = dateISO(body.dateFin || body.dateDebut);
  if (!statut) return NextResponse.json({ error: "Choisissez un type." }, { status: 400 });
  if (!debut || !fin || Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
    return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
  }
  if (fin < debut) return NextResponse.json({ error: "La date de fin doit être après la date de début." }, { status: 400 });

  const demiJournee = !!body.demiJournee;
  if (demiJournee && (fin.getTime() !== debut.getTime() || !["MATIN", "APREM"].includes(body.periode))) {
    return NextResponse.json({ error: "Une demi-journée porte sur une seule date : choisissez matin ou après-midi." }, { status: 400 });
  }

  const evenement = await prisma.agendaEvenement.create({
    data: {
      userId: session.user.id,
      statut: body.statut,
      dateDebut: debut,
      dateFin: fin,
      demiJournee,
      periode: demiJournee ? body.periode : null,
      lieu: statut.avecLieu && typeof body.lieu === "string" ? body.lieu.trim().slice(0, 80) || null : null,
      note: typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null,
    },
  });
  return NextResponse.json(evenement, { status: 201 });
}

// DELETE { id } : supprime une de ses exceptions.
export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  await prisma.agendaEvenement.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
