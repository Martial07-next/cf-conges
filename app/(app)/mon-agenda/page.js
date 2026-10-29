import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { dateFranceISO } from "@/lib/dateFrance";
import { estDirection, jourAgendaISO } from "@/lib/agendaDirection";
import AgendaDirectionEditor from "@/components/AgendaDirectionEditor";

export const dynamic = "force-dynamic";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Dates manipulées en UTC (minuit) pour rester alignées sur les entrées.
function utc(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}
function iso(d) {
  return d.toISOString().slice(0, 10);
}
function ajouterJours(d, n) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function lundiDe(d) {
  const jour = d.getUTCDay();
  return ajouterJours(d, jour === 0 ? -6 : 1 - jour);
}

// Agenda libre des Employeurs / RH et du pôle Direction : chaque demi-journée,
// ils indiquent où ils sont et s'ils sont joignables. Visible par toute
// l'équipe dans le planning et "Équipe en direct".
export default async function MonAgendaPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!estDirection(session?.user)) redirect("/dashboard");

  const aujourdHui = dateFranceISO();
  const demande = /^\d{4}-\d{2}-\d{2}$/.test(searchParams?.semaine || "") ? searchParams.semaine : aujourdHui;
  const lundi = lundiDe(utc(demande));
  const vendredi = ajouterJours(lundi, 4);
  const lundiPrecedent = ajouterJours(lundi, -7);

  const [entrees, entreesPrecedentes, lieux] = await Promise.all([
    prisma.agendaDirection.findMany({ where: { userId: session.user.id, date: { gte: lundi, lte: vendredi } } }),
    prisma.agendaDirection.findMany({ where: { userId: session.user.id, date: { gte: lundiPrecedent, lt: lundi } } }),
    prisma.agendaDirection.findMany({
      where: { userId: session.user.id, lieu: { not: null } },
      select: { lieu: true },
      distinct: ["lieu"],
      take: 30,
    }),
  ]);

  const jours = JOURS.map((nom, i) => {
    const d = ajouterJours(lundi, i);
    return { iso: iso(d), label: `${nom} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`, estAujourdhui: iso(d) === aujourdHui };
  });
  const enCreneaux = (liste, decalage = 0) =>
    Object.fromEntries(
      liste.map((e) => [
        `${iso(ajouterJours(utc(jourAgendaISO(e.date)), decalage))}_${e.periode}`,
        { statut: e.statut, lieu: e.lieu || "", note: e.note || "" },
      ])
    );

  const titreSemaine = `Semaine du ${lundi.getUTCDate()} ${MOIS[lundi.getUTCMonth()]} au ${vendredi.getUTCDate()} ${MOIS[vendredi.getUTCMonth()]} ${vendredi.getUTCFullYear()}`;

  return (
    <div>
      <PageHeader
        title="Mon agenda"
        subtitle="Indiquez où vous êtes et si vous êtes joignable, demi-journée par demi-journée. L'équipe le voit dans le planning et « Équipe en direct »."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={`/mon-agenda?semaine=${iso(lundiPrecedent)}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
        </Link>
        <span className="text-sm font-semibold text-brand-dark px-1">{titreSemaine}</span>
        <Link href={`/mon-agenda?semaine=${iso(ajouterJours(lundi, 7))}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
        </Link>
        <Link href="/mon-agenda">
          <span className="px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-brand-dark">Cette semaine</span>
        </Link>
      </div>

      <AgendaDirectionEditor
        key={iso(lundi)}
        jours={jours}
        initial={enCreneaux(entrees)}
        semainePrecedente={enCreneaux(entreesPrecedentes, 7)}
        lieuxConnus={lieux.map((l) => l.lieu).filter(Boolean)}
      />
    </div>
  );
}
