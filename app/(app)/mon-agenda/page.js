import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { dateFranceISO } from "@/lib/dateFrance";
import { estDirection, jourAgendaISO } from "@/lib/agendaDirection";
import AgendaRapide from "@/components/AgendaRapide";

export const dynamic = "force-dynamic";

const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
const JOURS_LONGS = ["lundis", "mardis", "mercredis", "jeudis", "vendredis"];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

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

// Agenda libre des Employeurs / RH et du pôle Direction. La semaine type se
// remplit une fois et s'applique chaque semaine ; "Cette semaine" ne sert
// qu'aux exceptions.
export default async function MonAgendaPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!estDirection(session?.user)) redirect("/dashboard");

  const vueType = searchParams?.vue === "type";
  const aujourdHui = dateFranceISO();
  const demande = /^\d{4}-\d{2}-\d{2}$/.test(searchParams?.semaine || "") ? searchParams.semaine : aujourdHui;
  const lundi = lundiDe(utc(demande));
  const vendredi = ajouterJours(lundi, 4);

  const [entrees, modeles, lieuxSemaine, lieuxModele] = await Promise.all([
    prisma.agendaDirection.findMany({ where: { userId: session.user.id, date: { gte: lundi, lte: vendredi } } }),
    prisma.agendaDirectionModele.findMany({ where: { userId: session.user.id } }),
    prisma.agendaDirection.findMany({ where: { userId: session.user.id, lieu: { not: null } }, select: { lieu: true }, distinct: ["lieu"], take: 20 }),
    prisma.agendaDirectionModele.findMany({ where: { userId: session.user.id, lieu: { not: null } }, select: { lieu: true }, distinct: ["lieu"] }),
  ]);
  const lieuxConnus = [...new Set([...lieuxModele, ...lieuxSemaine].map((l) => l.lieu).filter(Boolean))];

  const enCreneau = (e) => ({ statut: e.statut, lieu: e.lieu || null, note: e.note || null });
  const modele = Object.fromEntries(modeles.map((m) => [`${m.jour}_${m.periode}`, enCreneau(m)]));

  const colonnesSemaine = JOURS_COURTS.map((nom, i) => {
    const d = ajouterJours(lundi, i);
    return { id: iso(d), jour: i + 1, label: `${nom} ${d.getUTCDate()}`, aujourdhui: iso(d) === aujourdHui };
  });
  const colonnesModele = JOURS_COURTS.map((nom, i) => ({ id: i + 1, jour: i + 1, label: nom, titre: JOURS_LONGS[i] }));
  const initialSemaine = Object.fromEntries(entrees.map((e) => [`${jourAgendaISO(e.date)}_${e.periode}`, enCreneau(e)]));

  const onglet = (actif) =>
    `inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold ${actif ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50 hover:text-brand-dark"}`;

  return (
    <div>
      <PageHeader
        title="Mon agenda"
        subtitle="Choisissez un statut puis cliquez (ou glissez) sur les demi-journées. Tout s'enregistre automatiquement et l'équipe le voit dans le planning."
      />

      <div className="mb-5 inline-flex gap-1 rounded-xl bg-black/5 p-1">
        <Link href={`/mon-agenda?semaine=${iso(lundi)}`} className={onglet(!vueType)}>
          Cette semaine
        </Link>
        <Link href="/mon-agenda?vue=type" className={onglet(vueType)}>
          Ma semaine type
        </Link>
      </div>

      {vueType ? (
        <>
          <p className="mb-4 text-sm text-brand-dark/60">
            Votre semaine habituelle, appliquée automatiquement à <span className="font-semibold">toutes les semaines</span>. Vous n'aurez ensuite qu'à modifier les exceptions dans « Cette semaine ».
          </p>
          <AgendaRapide key="modele" mode="modele" colonnes={colonnesModele} initial={modele} lieuxConnus={lieuxConnus} />
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link href={`/mon-agenda?semaine=${iso(ajouterJours(lundi, -7))}`}>
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
            </Link>
            <span className="text-sm font-semibold text-brand-dark px-1">
              Semaine du {lundi.getUTCDate()} {MOIS[lundi.getUTCMonth()]} au {vendredi.getUTCDate()} {MOIS[vendredi.getUTCMonth()]}
            </span>
            <Link href={`/mon-agenda?semaine=${iso(ajouterJours(lundi, 7))}`}>
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
            </Link>
            <Link href="/mon-agenda">
              <span className="px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-brand-dark">Aujourd'hui</span>
            </Link>
          </div>
          {modeles.length === 0 && (
            <p className="mb-4 rounded-xl bg-brand-yellow/15 px-4 py-3 text-sm text-brand-dark">
              Astuce : remplissez une fois <Link href="/mon-agenda?vue=type" className="font-semibold underline">votre semaine type</Link>, elle s'appliquera à toutes les semaines.
            </p>
          )}
          <p className="mb-4 text-xs text-brand-dark/50">Les cases en pointillés viennent de votre semaine type. « Effacer » y revient.</p>
          <AgendaRapide key={iso(lundi)} mode="semaine" colonnes={colonnesSemaine} initial={initialSemaine} modele={modele} lieuxConnus={lieuxConnus} />
        </>
      )}
    </div>
  );
}
