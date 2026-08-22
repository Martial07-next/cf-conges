import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// POST { annee, mois } : marque le mois comme livre (gestionnaire TR / admin)
// et previent chaque collaborateur concerne par une notification, affichee
// une seule fois en pop-up a leur prochaine connexion.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "tr")) {
    return NextResponse.json({ error: "Réservé au gestionnaire TR." }, { status: 403 });
  }

  const { annee, mois } = await req.json();
  if (!Number.isInteger(annee) || !Number.isInteger(mois) || mois < 0 || mois > 11) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const existant = await prisma.ticketRestauLivraison.findUnique({ where: { annee_mois: { annee, mois } } });
  if (existant) {
    return NextResponse.json({ error: "Ce mois a déjà été marqué comme livré." }, { status: 400 });
  }

  const livraison = await prisma.ticketRestauLivraison.create({
    data: { annee, mois, livreParId: session.user.id },
  });

  const destinataires = await prisma.user.findMany({
    where: { statutCompte: "ACTIF", visiblePlanning: true },
    select: { id: true },
  });
  await Promise.all(
    destinataires.map((d) =>
      notify(d.id, "Tickets restaurant livrés", `Vos tickets restaurant de ${MOIS_LONGS[mois]} ${annee} ont été livrés.`)
    )
  );

  return NextResponse.json(livraison);
}
