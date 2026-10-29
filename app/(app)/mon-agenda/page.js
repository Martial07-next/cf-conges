import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { dateFranceISO } from "@/lib/dateFrance";
import { estDirection, indexerEvenements, creneauxDuJour } from "@/lib/agendaDirection";
import AgendaPinceau from "@/components/AgendaPinceau";
import { estJourFerie } from "@/lib/joursFeries";

export const dynamic = "force-dynamic";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// Dates en UTC (minuit) pour rester alignées sur les exceptions enregistrées.
function iso(d) {
  return d.toISOString().slice(0, 10);
}
function ajouterJours(d, n) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function moisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, "0")}`;
}

// Agenda des Employeurs / RH et du pôle Direction : présent par défaut, on
// peint seulement les exceptions sur le calendrier du mois.
export default async function MonAgendaPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!estDirection(session?.user)) redirect("/dashboard");

  const aujourdHui = dateFranceISO();
  const [aY, aM] = aujourdHui.split("-").map(Number);
  let annee = aY;
  let mois = aM - 1;
  if (/^\d{4}-\d{2}$/.test(searchParams?.mois || "")) {
    const [y, m] = searchParams.mois.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      annee = y;
      mois = m - 1;
    }
  }

  // Semaines du lundi au vendredi qui couvrent le mois affiché.
  const premier = new Date(Date.UTC(annee, mois, 1));
  const dernier = new Date(Date.UTC(annee, mois + 1, 0));
  const decalage = (premier.getUTCDay() + 6) % 7; // lundi = 0
  let lundi = ajouterJours(premier, -decalage);
  const semaines = [];
  while (lundi <= dernier) {
    semaines.push(
      Array.from({ length: 5 }, (_, i) => {
        const d = ajouterJours(lundi, i);
        const ferie = estJourFerie(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        return { iso: iso(d), numero: d.getUTCDate(), horsMois: d.getUTCMonth() !== mois, passe: iso(d) < aujourdHui, aujourdhui: iso(d) === aujourdHui, ferie: ferie?.libelle || null };
      })
    );
    lundi = ajouterJours(lundi, 7);
  }
  const debut = new Date(`${semaines[0][0].iso}T00:00:00.000Z`);
  const fin = new Date(`${semaines[semaines.length - 1][4].iso}T00:00:00.000Z`);

  const [evenements, lieux] = await Promise.all([
    prisma.agendaEvenement.findMany({ where: { userId: session.user.id, dateDebut: { lte: fin }, dateFin: { gte: debut } } }),
    prisma.agendaEvenement.findMany({ where: { userId: session.user.id, lieu: { not: null } }, select: { lieu: true }, distinct: ["lieu"], take: 20 }),
  ]);
  const index = indexerEvenements(evenements);
  const initial = {};
  for (const semaine of semaines) {
    for (const j of semaine) {
      const c = creneauxDuJour(index, session.user.id, j.iso);
      if (c) initial[j.iso] = c;
    }
  }

  const precedent = mois === 0 ? moisParam(annee - 1, 11) : moisParam(annee, mois - 1);
  const suivant = mois === 11 ? moisParam(annee + 1, 0) : moisParam(annee, mois + 1);

  return (
    <div>
      <PageHeader
        title="Mon agenda"
        subtitle="Par défaut, vous êtes présent. Choisissez un type puis cliquez sur les jours concernés : l'équipe le voit dans le planning."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/mon-agenda?mois=${precedent}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
        </Link>
        <span className="min-w-[140px] px-1 text-center text-sm font-semibold text-brand-dark">
          {MOIS[mois]} {annee}
        </span>
        <Link href={`/mon-agenda?mois=${suivant}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
        </Link>
        <Link href="/mon-agenda">
          <span className="px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-brand-dark">Aujourd'hui</span>
        </Link>
      </div>

      <AgendaPinceau key={moisParam(annee, mois)} semaines={semaines} initial={initial} lieuxConnus={lieux.map((l) => l.lieu).filter(Boolean)} />
    </div>
  );
}
