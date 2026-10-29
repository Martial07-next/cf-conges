import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { feriesEnSemaine, isoJour } from "@/lib/feriesOuverture";

export const dynamic = "force-dynamic";

// Fenêtre dans laquelle la direction est sollicitée pour un férié à venir.
const JOURS_AVANT_DECISION = 30;

// GET : prochain jour férié en semaine (sous 30 jours) sans décision de la
// direction, ou null. Utilisé pour la pop-up du compte ayant l'accès
// "Décision jours fériés".
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "feries")) return NextResponse.json(null);

  const aujourdhui = new Date(new Date().toDateString());
  const limite = new Date(aujourdhui);
  limite.setDate(limite.getDate() + JOURS_AVANT_DECISION);

  for (const f of feriesEnSemaine(aujourdhui, limite)) {
    const decision = await prisma.jourFerieOuverture.findUnique({ where: { date: f.date } });
    if (!decision) return NextResponse.json({ date: isoJour(f.date), libelle: f.libelle });
  }
  return NextResponse.json(null);
}

// POST { date: "AAAA-MM-JJ", ouvert } : la direction autorise (ou non) ses
// collaborateurs à travailler ce jour férié. "Oui" prévient les
// collaborateurs, qui reçoivent ensuite la question dans CF Congés ;
// "Non" ne déclenche rien.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "feries")) {
    return NextResponse.json({ error: "Réservé au compte chargé des jours fériés." }, { status: 403 });
  }

  const { date, ouvert } = await req.json().catch(() => ({}));
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof ouvert !== "boolean") {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  const [y, m, d] = date.split("-").map(Number);
  const jour = new Date(y, m - 1, d);
  const ferie = feriesEnSemaine(jour, jour)[0];
  if (!ferie) return NextResponse.json({ error: "Ce jour n'est pas un jour férié en semaine." }, { status: 400 });
  if (jour < new Date(new Date().toDateString())) {
    return NextResponse.json({ error: "Ce jour férié est déjà passé." }, { status: 400 });
  }

  const avant = await prisma.jourFerieOuverture.findUnique({ where: { date: jour } });
  const decision = await prisma.jourFerieOuverture.upsert({
    where: { date: jour },
    update: { ouvert, decideParId: session.user.id },
    create: { date: jour, ouvert, decideParId: session.user.id },
  });

  await logAudit(session.user.id, "JOUR_FERIE_OUVERTURE", `${date} (${ferie.libelle}) : ${ouvert ? "travail autorisé" : "fermé"}`);

  // Ouverture (nouvelle) : on prévient les collaborateurs concernés. Les
  // Employeurs / RH et le pôle Direction ne posent pas ce type de demande.
  if (ouvert && !avant?.ouvert) {
    const collaborateurs = await prisma.user.findMany({
      where: {
        statutCompte: "ACTIF",
        id: { not: session.user.id },
        role: { not: "EMPLOYEUR" },
        OR: [{ pole: null }, { pole: { not: "Direction" } }],
      },
      select: { id: true },
    });
    const dateLabel = jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    await Promise.all(
      collaborateurs.map((c) =>
        notify(
          c.id,
          "Jour férié : travail possible",
          `La direction autorise le travail le ${dateLabel} (${ferie.libelle}). Ouvrez CF Congés pour indiquer si vous souhaitez travailler ce jour-là.`
        )
      )
    );
  }

  return NextResponse.json(decision);
}
