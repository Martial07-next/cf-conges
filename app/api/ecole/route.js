import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { estJourFerie } from "@/lib/joursFeries";

export const dynamic = "force-dynamic";

// POST : l'alternant ajoute lui-même une ou plusieurs périodes "École" —
// validées automatiquement, sans passer par l'employeur/admin. Les week-ends
// et jours fériés compris dans la plage sont automatiquement exclus (pas de
// cours ces jours-là), et la plage est redécoupée en blocs continus autour
// de ces jours-là si besoin.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user.estAlternant) {
    return NextResponse.json({ error: "Réservé aux comptes alternants." }, { status: 403 });
  }

  const { dateDebut, dateFin } = await req.json();
  if (!dateDebut || !dateFin) {
    return NextResponse.json({ error: "Dates de début et de fin obligatoires." }, { status: 400 });
  }

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  if (fin < debut) {
    return NextResponse.json({ error: "La date de fin doit être postérieure à la date de début." }, { status: 400 });
  }

  const ec = await prisma.leaveType.findUnique({ where: { code: "ec" } });
  if (!ec) return NextResponse.json({ error: "Type de congé École introuvable." }, { status: 500 });

  // Ne garde que les jours ouvrés (hors week-end et jours fériés)
  const jours = [];
  let curseur = new Date(debut);
  while (curseur <= fin) {
    const weekend = curseur.getDay() === 0 || curseur.getDay() === 6;
    if (!weekend && !estJourFerie(curseur)) jours.push(new Date(curseur));
    curseur = new Date(curseur);
    curseur.setDate(curseur.getDate() + 1);
  }

  if (jours.length === 0) {
    return NextResponse.json({ error: "Aucun jour ouvré dans cette période (week-end ou jour férié uniquement)." }, { status: 400 });
  }

  // Regroupe les jours consécutifs en blocs (rupture à chaque week-end/férié)
  const blocs = [];
  let blocCourant = [jours[0]];
  for (let i = 1; i < jours.length; i++) {
    const precedent = blocCourant[blocCourant.length - 1];
    const diff = Math.round((jours[i] - precedent) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      blocCourant.push(jours[i]);
    } else {
      blocs.push(blocCourant);
      blocCourant = [jours[i]];
    }
  }
  blocs.push(blocCourant);

  const entries = await prisma.$transaction(
    blocs.map((bloc) =>
      prisma.leaveRequest.create({
        data: {
          userId: session.user.id,
          leaveTypeId: ec.id,
          dateDebut: bloc[0],
          dateFin: bloc[bloc.length - 1],
          statut: "VALIDE",
          motif: "Période école",
          gereParAlternant: true,
        },
        include: { leaveType: true },
      })
    )
  );

  await logAudit(session.user.id, "ECOLE_AJOUTEE", `${dateDebut} → ${dateFin} (${blocs.length} bloc(s))`);
  return NextResponse.json(entries, { status: 201 });
}
