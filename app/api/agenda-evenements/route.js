import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estDirection, STATUTS_AGENDA } from "@/lib/agendaDirection";

export const dynamic = "force-dynamic";

const UN_JOUR = 86400000;

function dateISO(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function champs(e) {
  return { userId: e.userId, statut: e.statut, lieu: e.lieu, note: e.note, demiJournee: e.demiJournee, periode: e.periode };
}

// PUT { jours: ["AAAA-MM-JJ"], periode: null | "MATIN" | "APREM", statut: null | <type>, lieu?, note? }
// "Pinceau" de l'agenda : applique un type (ou "Présent" si statut vide) à
// chaque jour, sur la journée entière ou seulement la demi-journée choisie.
export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!estDirection(session.user)) {
    return NextResponse.json({ error: "Réservé aux Employeurs / RH et au pôle Direction." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const jours = Array.isArray(body.jours) ? [...new Set(body.jours)].map(dateISO) : [];
  if (jours.length === 0 || jours.length > 62 || jours.some((d) => !d)) {
    return NextResponse.json({ error: "Jours invalides." }, { status: 400 });
  }
  const periode = body.periode === "MATIN" || body.periode === "APREM" ? body.periode : null;
  const statut = body.statut ? STATUTS_AGENDA[body.statut] : null;
  if (body.statut && !statut) return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
  const lieu = statut?.avecLieu && typeof body.lieu === "string" ? body.lieu.trim().slice(0, 80) || null : null;
  const note = statut && typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;
  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    for (const jour of jours) {
      // 1. Une exception sur plusieurs jours qui couvre ce jour est découpée
      //    (avant / ce jour / après) pour ne modifier que ce jour.
      const couvrants = await tx.agendaEvenement.findMany({
        where: { userId, dateDebut: { lte: jour }, dateFin: { gte: jour } },
      });
      for (const e of couvrants) {
        if (e.dateDebut.getTime() === e.dateFin.getTime()) continue;
        await tx.agendaEvenement.delete({ where: { id: e.id } });
        const morceaux = [
          [e.dateDebut, new Date(jour.getTime() - UN_JOUR)],
          [jour, jour],
          [new Date(jour.getTime() + UN_JOUR), e.dateFin],
        ].filter(([debut, fin]) => debut <= fin);
        for (const [dateDebut, dateFin] of morceaux) {
          await tx.agendaEvenement.create({ data: { ...champs(e), dateDebut, dateFin } });
        }
      }

      // 2. Exceptions de ce seul jour.
      const duJour = await tx.agendaEvenement.findMany({ where: { userId, dateDebut: jour, dateFin: jour } });
      if (!periode) {
        await tx.agendaEvenement.deleteMany({ where: { id: { in: duJour.map((e) => e.id) } } });
      } else {
        const autre = periode === "MATIN" ? "APREM" : "MATIN";
        for (const e of duJour) {
          if (!e.demiJournee) {
            // Journée entière : on garde l'autre demi-journée telle quelle.
            await tx.agendaEvenement.update({ where: { id: e.id }, data: { demiJournee: true, periode: autre } });
          } else if (e.periode === periode) {
            await tx.agendaEvenement.delete({ where: { id: e.id } });
          }
        }
      }

      // 3. Nouveau type (rien à créer pour "Présent").
      if (statut) {
        await tx.agendaEvenement.create({
          data: { userId, statut: body.statut, lieu, note, dateDebut: jour, dateFin: jour, demiJournee: !!periode, periode },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
