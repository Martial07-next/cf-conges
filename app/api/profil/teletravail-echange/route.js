import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function dateFranceDepuisISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error("Date invalide.");
  }
  return new Date(`${iso}T00:00:00.000Z`);
}

export const dynamic = "force-dynamic";

// POST : echange un jour de teletravail contre un autre, pour une semaine
// donnee. dateRetrait = jour habituel qu'on annule cette semaine-la.
// dateAjout = nouveau jour de teletravail cette semaine-la (a la place).
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user.teletravailAutorise) {
    return NextResponse.json({ error: "Le télétravail n'est pas autorisé pour votre compte." }, { status: 403 });
  }

  const { dateRetrait, dateAjout } = await req.json();
  if (!dateRetrait || !dateAjout) {
    return NextResponse.json({ error: "Choisissez le jour à retirer et le nouveau jour." }, { status: 400 });
  }

  if (dateRetrait === dateAjout) {
    return NextResponse.json({ error: "Les deux jours doivent être différents." }, { status: 400 });
  }

  let retrait;
  let ajout;
  try {
    retrait = dateFranceDepuisISO(dateRetrait);
    ajout = dateFranceDepuisISO(dateAjout);
  } catch {
    return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.teletravailOverride.upsert({
      where: { userId_date: { userId: user.id, date: retrait } },
      update: { type: "RETRAIT" },
      create: { userId: user.id, date: retrait, type: "RETRAIT" },
    }),
    prisma.teletravailOverride.upsert({
      where: { userId_date: { userId: user.id, date: ajout } },
      update: { type: "AJOUT" },
      create: { userId: user.id, date: ajout, type: "AJOUT" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
