import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { estJourFerie } from "@/lib/joursFeries";
import { dateFranceISO } from "@/lib/dateFrance";
import PlanningDatePicker from "@/components/PlanningDatePicker";
import PlanningPoleFilter from "@/components/PlanningPoleFilter";
import ForcerVueMobile from "@/components/ForcerVueMobile";
import { couleurPole } from "@/lib/poles";
import { estAnniversaireLe } from "@/lib/anniversaires";
import { indexerEvenements, creneauxDuJour, STATUTS_AGENDA } from "@/lib/agendaDirection";
import { CaseJournee, FriseJournee } from "@/components/planning/CaseJournee";
import { HoteDetailJournee } from "@/components/planning/DetailJournee";
import { TuileIcone } from "@/components/Icone";
import { ETAT_BUREAU, etatAgenda, etatDemande, etatFerie, etatTeletravail, etatFormation, formationsSurPeriode, apparenceEtat, categorieJournee } from "@/lib/etatJournee";
import { formationsPeriode, indexerFormations } from "@/lib/planningFormations";

export const dynamic = "force-dynamic";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SOCIETE_DEBUT = new Date(2021, 6, 1); // création de CF Réseaux : 1er juillet 2021

function toISODate(d) {
  return dateFranceISO(d);
}
function parseISODate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}
function parseMonthParam(param) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}
function toMonthParam(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function avecPole(href, pole) {
  if (!pole) return href;
  return `${href}${href.includes("?") ? "&" : "?"}pole=${encodeURIComponent(pole)}`;
}

function ViewTabs({ vue, mois, semaine, jour, pole }) {
  const tabs = [
    { key: "jour", label: "Jour", href: avecPole(`/planning?vue=jour&jour=${jour}`, pole), mobile: true },
    { key: "semaine", label: "Semaine", href: avecPole(`/planning?vue=semaine&semaine=${semaine}`, pole), mobile: true },
    { key: "mois", label: "Mois", href: avecPole(`/planning?vue=mois&mois=${mois}`, pole), mobile: false },
  ];
  return (
    <div className="inline-flex bg-black/5 dark:bg-white/10 rounded-xl p-1 gap-1">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} prefetch={false} className={t.mobile ? "" : "hidden md:inline-block"}>
          <span
            className={`inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              vue === t.key ? "bg-white text-brand-dark shadow-sm dark:bg-brand-night" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            {t.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function NavArrow({ href, children, disabled = false }) {
  if (disabled) {
    return (
      <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-white/5 text-[#EBF0E8]/20 cursor-not-allowed">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} prefetch={false}>
      <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#EBF0E8] hover:bg-white/10 focus-ring">
        {children}
      </span>
    </Link>
  );
}

export default async function PlanningPage({ searchParams }) {
  const vue = ["jour", "semaine", "mois"].includes(searchParams?.vue) ? searchParams.vue : "mois";
  const today = new Date();
  const todayISO = toISODate(today);

  const jourParam = searchParams?.jour && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.jour) ? searchParams.jour : todayISO;
  const semaineParam = searchParams?.semaine && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.semaine) ? searchParams.semaine : todayISO;
  const { year, month } = parseMonthParam(searchParams?.mois);
  const moisParam = toMonthParam(year, month);
  const poleActif = typeof searchParams?.pole === "string" ? searchParams.pole : "";

  let rangeStart, rangeEnd, days;

  if (vue === "jour") {
    rangeStart = parseISODate(jourParam);
    rangeEnd = rangeStart;
    days = [rangeStart];
  } else if (vue === "semaine") {
    rangeStart = startOfWeek(parseISODate(semaineParam));
    rangeEnd = addDays(rangeStart, 6);
    days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
  } else {
    rangeStart = new Date(year, month, 1);
    rangeEnd = new Date(year, month + 1, 0);
    days = Array.from({ length: rangeEnd.getDate() }, (_, i) => new Date(year, month, i + 1));
  }

    // Bloque tout acces (via le selecteur de date, une URL tapee a la main, etc.)
  // a une periode anterieure a la creation de la societe : redirige vers la
  // date de creation elle-meme plutot que d'afficher un planning vide.
  if (rangeStart < SOCIETE_DEBUT) {
    if (vue === "jour") redirect(`/planning?vue=jour&jour=${toISODate(SOCIETE_DEBUT)}`);
    if (vue === "semaine") redirect(`/planning?vue=semaine&semaine=${toISODate(SOCIETE_DEBUT)}`);
    redirect(`/planning?vue=mois&mois=${toMonthParam(SOCIETE_DEBUT.getFullYear(), SOCIETE_DEBUT.getMonth())}`);
  }

    const limiteAtteinte = rangeStart <= SOCIETE_DEBUT;
    const estSemaineActuelle = vue === "semaine" && toISODate(rangeStart) === toISODate(startOfWeek(today));

    // Agenda Direction (Employeurs / RH, pôle Direction), en dates UTC minuit.
    const debutAgenda = new Date(`${toISODate(rangeStart)}T00:00:00.000Z`);
    const finAgenda = new Date(`${toISODate(rangeEnd)}T00:00:00.000Z`);

    const [usersBruts, requests, leaveTypes, overrides, feriesAcceptes, evenementsAgenda, formationsBrutes] = await Promise.all([
    prisma.user.findMany({
      // Les Employeurs / RH et le pôle Direction apparaissent toujours (pour
      // savoir s'ils sont joignables), même s'ils sont masqués du planning
      // d'ordinaire (ils n'ont pas de tickets restaurant).
      where: { OR: [{ visiblePlanning: true }, { role: "EMPLOYEUR" }, { pole: "Direction" }] },
      include: {
        teletravailJoursFixes: {
          where: {
            dateDebut: { lte: rangeEnd },
            OR: [
              { dateFin: null },
              { dateFin: { gte: rangeStart } },
            ],
          },
        },
      },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    }),
    prisma.leaveRequest.findMany({
      where: { statut: "VALIDE", dateDebut: { lte: rangeEnd }, dateFin: { gte: rangeStart } },
      include: { leaveType: true },
    }),
    prisma.leaveType.findMany({ orderBy: { ordre: "asc" } }),
    prisma.teletravailOverride.findMany({ where: { date: { gte: rangeStart, lte: rangeEnd } } }),
    prisma.jourFerieDecision.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd }, statut: "VALIDE", souhaiteTravailler: true },
    }),
    prisma.agendaEvenement.findMany({ where: { dateDebut: { lte: finAgenda }, dateFin: { gte: debutAgenda } } }),
    // Formateurs en formation sur la période (planning CF Formations).
    formationsPeriode(toISODate(rangeStart), toISODate(rangeEnd), todayISO),
  ]);
  const agendaParPersonne = indexerEvenements(evenementsAgenda);
  const formationsParJour = indexerFormations(formationsBrutes, usersBruts);
  // Exceptions saisies par un Employeur / RH ou la Direction ce jour-là (null
  // = présent, la case habituelle s'affiche).
  function agendaDe(u, jour) {
    return creneauxDuJour(agendaParPersonne, u.id, toISODate(jour));
  }

  // Un collaborateur n'apparait qu'a partir du mois de son embauche, et reste
  // visible jusqu'a la fin du mois de son depart (pour garder l'historique
  // intact), puis disparait a partir du mois suivant. On garde aussi les
  // comptes desactives s'ils ont une date de sortie recente, pour ne pas
  // casser l'historique si l'admin desactive le compte.
  function visibleSurCettePeriode(u) {
    if (u.statutCompte !== "ACTIF" && !u.dateSortie) return false;

    if (u.dateEntree) {
      const entree = new Date(u.dateEntree);
      const debutMoisEntree = new Date(entree.getFullYear(), entree.getMonth(), 1);
      if (rangeEnd < debutMoisEntree) return false;
    }

    if (!u.dateSortie) return true;
    const sortie = new Date(u.dateSortie);
    const finMoisSortie = new Date(sortie.getFullYear(), sortie.getMonth() + 1, 0, 23, 59, 59);
    return rangeStart <= finMoisSortie;
  }
  const usersPeriode = usersBruts.filter(visibleSurCettePeriode);
  const poles = [...new Set(usersPeriode.map((u) => u.pole).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const users = poleActif ? usersPeriode.filter((u) => u.pole === poleActif) : usersPeriode;

  // Quand tout le monde est affiché, un trait de couleur discret à gauche du
  // nom distingue chaque pôle.
  function traitPole(u) {
    const couleur = !poleActif && couleurPole(u.pole);
    return couleur ? { boxShadow: `inset 3px 0 0 ${couleur}` } : undefined;
  }
  const legendePoles = poleActif ? [] : poles.filter((p) => couleurPole(p));

  // Initiales dans la couleur du pôle (même repère que le tableau de bord).
  function pastille(u) {
    const couleur = couleurPole(u.pole) || "#0afe6b";
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0E1712]"
        style={{ backgroundColor: couleur }}
        aria-hidden
      >
        {`${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase()}
      </span>
    );
  }

  // Gâteau à côté du nom uniquement le jour même de l'anniversaire (et si
  // aujourd'hui fait partie de la période affichée).
  const aujourdhuiAffiche = toISODate(rangeStart) <= todayISO && todayISO <= toISODate(rangeEnd);
  function gateau(u) {
    if (!aujourdhuiAffiche || !estAnniversaireLe(u.dateNaissance, todayISO)) return null;
    return (
      <span className="ml-1.5" title="C'est son anniversaire aujourd'hui !">
        🎂
      </span>
    );
  }

  const feriesTravaillesSet = new Set(feriesAcceptes.map((f) => `${f.userId}_${toISODate(f.date)}`));
  function ferieDuJour(day) {
    return estJourFerie(day);
  }
  function estFerieTravaille(userId, day) {
    return feriesTravaillesSet.has(`${userId}_${toISODate(day)}`);
  }

  const JOURS_CODE = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

  // Index construits une fois : chaque case les consulte sans reparcourir
  // toutes les demandes (le planning du mois compte des centaines de cases).
  const overridesParJour = new Map(overrides.map((o) => [`${o.userId}_${toISODate(o.date)}_${o.type}`, o]));
  const demandesParUser = new Map();
  for (const r of requests) {
    const liste = demandesParUser.get(r.userId) || [];
    liste.push({ ...r, debutISO: toISODate(r.dateDebut), finISO: toISODate(r.dateFin) });
    demandesParUser.set(r.userId, liste);
  }

  function findTeletravail(user, day) {
    const key = toISODate(day);
    if (overridesParJour.has(`${user.id}_${key}_AJOUT`)) return true;
    if (overridesParJour.has(`${user.id}_${key}_RETRAIT`)) return false;
    if (!user.teletravailAutorise) return false;

    return user.teletravailJoursFixes.some(
      (jourFixe) =>
        jourFixe.jour === JOURS_CODE[day.getDay()] &&
        toISODate(jourFixe.dateDebut) <= key &&
        (!jourFixe.dateFin || toISODate(jourFixe.dateFin) >= key)
    );
  }

  function findDays(userId, day) {
    const jour = toISODate(day);
    return (demandesParUser.get(userId) || []).filter((r) => r.debutISO <= jour && jour <= r.finISO);
  }

  function avantEmbaucheDe(user, day) {
    return user.dateEntree && day < new Date(user.dateEntree);
  }
  function apresDepartDe(user, day) {
    return user.dateSortie && day > new Date(user.dateSortie);
  }

  function estWeekend(day) {
    return day.getDay() === 0 || day.getDay() === 6;
  }

  // Matin et après-midi d'une personne : agenda Direction, congé validé,
  // formation (CF Formations), férié, télétravail, sinon au bureau.
  // null = hors contrat.
  function etatsJournee(u, day) {
    if (avantEmbaucheDe(u, day) || apresDepartDe(u, day)) return null;
    if (estWeekend(day)) return { weekend: true };
    const agenda = agendaDe(u, day);
    if (agenda) return { matin: etatAgenda(agenda.MATIN), aprem: etatAgenda(agenda.APREM) };
    const ferie = ferieDuJour(day);
    const base = ferie ? etatFerie(ferie.libelle, estFerieTravaille(u.id, day)) : findTeletravail(u, day) ? etatTeletravail() : ETAT_BUREAU;
    const demandes = findDays(u.id, day);
    const formations = formationsParJour.get(`${u.id}_${toISODate(day)}`);
    // Comme l'« Équipe en direct » : congé > formation > télétravail / bureau.
    const pour = (periode) => {
      const r = demandes.find((d) => !d.demiJournee || d.demiJourneePeriode === periode);
      if (r && r.leaveType.code !== "TT") return etatDemande(r.leaveType);
      const enFormation = formationsSurPeriode(formations, periode);
      if (enFormation.length) return etatFormation(enFormation);
      return r ? etatDemande(r.leaveType) : base;
    };
    return { matin: pour("MATIN"), aprem: pour("APREM") };
  }

  function personneDe(u) {
    return {
      nom: `${u.prenom} ${u.nom}`,
      initiales: `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase(),
      pole: u.pole || null,
      couleurPole: couleurPole(u.pole),
    };
  }
  function libelleDate(d) {
    return `${JOURS_SEMAINE[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Détail de la journée : chaque personne, date et état n'est envoyé qu'une
  // fois au navigateur ; une case ne porte que leurs numéros ("p.d.m.a").
  const registre = { personnes: [], dates: [], etats: [] };
  const positions = { personnes: new Map(), dates: new Map(), etats: new Map() };
  function position(type, cle, valeur) {
    if (!positions[type].has(cle)) {
      positions[type].set(cle, registre[type].length);
      registre[type].push(valeur);
    }
    return positions[type].get(cle);
  }
  function refJournee(u, d, etats) {
    return [
      position("personnes", u.id, personneDe(u)),
      position("dates", toISODate(d), libelleDate(d)),
      position("etats", JSON.stringify(etats.matin), etats.matin),
      position("etats", JSON.stringify(etats.aprem), etats.aprem),
    ].join(".");
  }

  // Case des vues Semaine / Mois.
  function caseDe(u, d) {
    const etats = etatsJournee(u, d);
    const h = vue === "mois" ? "h-5" : "h-7";
    if (!etats) return <span className={`inline-block w-full ${h}`} />;
    if (etats.weekend) {
      return (
        <span title="Week-end" className={`case-wk ${h} ${vue === "mois" ? "text-[9px]" : "text-[10px]"}`}>
          WK
        </span>
      );
    }
    return <CaseJournee refJournee={refJournee(u, d, etats)} matin={etats.matin} aprem={etats.aprem} variante={vue} />;
  }

  // Légende commune aux trois vues.
  const legende = [
    { code: "B", label: "Au bureau", etat: ETAT_BUREAU },
    { code: "TT", label: "Télétravail", etat: etatTeletravail() },
    ...leaveTypes
      .filter((t) => !["TT", "JT", "F", "x"].includes(t.code))
      .map((t) => ({ code: t.code, label: t.libelle, etat: etatDemande(t) })),
    ...(formationsParJour.size > 0 ? [{ code: "F", label: "En formation", etat: etatFormation([]) }] : []),
    { code: "JF", label: "Férié", etat: etatFerie("") },
    { code: "FT", label: "Férié travaillé", etat: etatFerie("", true) },
  ];
  const legendeAgenda = Object.values(STATUTS_AGENDA)
    .filter((st) => st !== STATUTS_AGENDA.TELETRAVAIL)
    .map((st) => ({ code: st.code, label: st.label, etat: etatAgenda({ statut: Object.keys(STATUTS_AGENDA).find((k) => STATUTS_AGENDA[k] === st) }) }));

  let prevHref, nextHref, todayHref, title;
  if (vue === "jour") {
    prevHref = avecPole(`/planning?vue=jour&jour=${toISODate(addDays(rangeStart, -1))}`, poleActif);
    nextHref = avecPole(`/planning?vue=jour&jour=${toISODate(addDays(rangeStart, 1))}`, poleActif);
    todayHref = avecPole(`/planning?vue=jour&jour=${todayISO}`, poleActif);
    title = `${JOURS_SEMAINE[rangeStart.getDay() === 0 ? 6 : rangeStart.getDay() - 1]} ${rangeStart.getDate()} ${MOIS[rangeStart.getMonth()]} ${rangeStart.getFullYear()}`;
  } else if (vue === "semaine") {
    prevHref = avecPole(`/planning?vue=semaine&semaine=${toISODate(addDays(rangeStart, -7))}`, poleActif);
    nextHref = avecPole(`/planning?vue=semaine&semaine=${toISODate(addDays(rangeStart, 7))}`, poleActif);
    todayHref = avecPole(`/planning?vue=semaine&semaine=${todayISO}`, poleActif);
    title = `${rangeStart.getDate()} ${MOIS[rangeStart.getMonth()]} → ${rangeEnd.getDate()} ${MOIS[rangeEnd.getMonth()]}`;
  } else {
    const prevM = toMonthParam(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
    const nextM = toMonthParam(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
    prevHref = avecPole(`/planning?vue=mois&mois=${prevM}`, poleActif);
    nextHref = avecPole(`/planning?vue=mois&mois=${nextM}`, poleActif);
    todayHref = avecPole(`/planning?vue=mois&mois=${toMonthParam(today.getFullYear(), today.getMonth())}`, poleActif);
    title = `${MOIS[month]} ${year}`;
  }

  // Contenu calculé avant le rendu, pour que le registre du détail soit complet.
  const contenu = vue === "jour" ? (
        vueJour()
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[170px] border-b border-black/5 bg-white px-4 py-3 text-left font-semibold text-brand-dark/70">
                  Collaborateur
                </th>
                {days.map((d) => {
                  const weekend = estWeekend(d);
                  const isToday = toISODate(d) === todayISO;
                  const masquerSurMobile = vue === "semaine" && estSemaineActuelle && toISODate(d) < todayISO;
                  return (
                    <th
                      key={d.toISOString()}
                      className={`border-b border-black/5 text-center font-medium ${vue === "mois" ? "min-w-[30px] px-1 py-3" : "min-w-[110px] px-2 py-3"} ${
                        weekend ? "bg-black/[0.02] text-brand-dark/30" : "text-brand-dark/60"
                      } ${isToday ? "bg-brand-green/10" : ""} ${masquerSurMobile ? "hidden md:table-cell" : ""}`}
                    >
                      {vue === "semaine" && <div>{JOURS_SEMAINE[d.getDay() === 0 ? 6 : d.getDay() - 1].slice(0, 3)}</div>}
                      <div className={vue === "semaine" ? "text-sm font-bold text-brand-dark" : ""}>
                        {isToday ? <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand-green px-1 font-bold text-[#0E1712]">{d.getDate()}</span> : d.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-black/5 transition-colors last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.03]">
                  <td className={`sticky left-0 z-10 whitespace-nowrap bg-white px-4 font-medium text-brand-dark ${vue === "mois" ? "py-2" : "py-2.5"}`} style={traitPole(u)} title={u.pole || undefined}>
                    <span className="flex items-center gap-2">
                      {pastille(u)}
                      <span>
                        {u.prenom} {u.nom}
                        {gateau(u)}
                      </span>
                    </span>
                  </td>
                  {days.map((d) => {
                    const masquerSurMobile = vue === "semaine" && estSemaineActuelle && toISODate(d) < todayISO;
                    return (
                      <td
                        key={d.toISOString()}
                        className={`${vue === "mois" ? "px-0.5 py-2" : "px-1.5 py-2.5"} text-center ${estWeekend(d) ? "bg-black/[0.02]" : ""} ${toISODate(d) === todayISO ? "bg-brand-green/[0.07]" : ""} ${masquerSurMobile ? "hidden md:table-cell" : ""}`}
                      >
                        {caseDe(u, d)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      );

  return (
    <div>
      <ForcerVueMobile vueActuelle={vue} vueABloquer="mois" urlCible={`/planning?vue=semaine&semaine=${semaineParam}`} />
      {/* Bandeau (même style que le tableau de bord et le profil) */}
      <section className="relative mb-4 overflow-hidden rounded-2xl bg-[#0E1712] text-[#EBF0E8] shadow-[0_12px_40px_-24px_rgba(10,254,107,0.45)] md:mt-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#0afe6b]/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <TuileIcone name="planning" sombre />
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight sm:text-lg">Planning équipe</h1>
              <p className="truncate text-xs text-[#EBF0E8]/55">
                {users.length} collaborateur{users.length > 1 ? "s" : ""}
                {poleActif ? ` · ${poleActif}` : ""} · qui est présent, en congé ou en télétravail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavArrow href={prevHref} disabled={limiteAtteinte}>‹</NavArrow>
            <span className="min-w-[150px] px-1 text-center text-sm font-semibold">{title}</span>
            <NavArrow href={nextHref}>›</NavArrow>
            <Link href={todayHref} prefetch={false} className="whitespace-nowrap rounded-lg bg-[#0afe6b] px-3 py-1.5 text-xs font-bold text-[#0E1712] transition hover:bg-[#3dff8c]">
              Aujourd'hui
            </Link>
          </div>
        </div>
      </section>

      {/* Barre d'outils */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2.5 shadow-card dark:border-white/10 dark:bg-brand-night">
        <ViewTabs vue={vue} mois={moisParam} semaine={semaineParam} jour={jourParam} pole={poleActif} />
        <div className="flex flex-wrap items-center gap-2">
          <PlanningDatePicker vue={vue} currentDate={toISODate(rangeStart)} pole={poleActif} />
          <PlanningPoleFilter poles={poles} poleActif={poleActif} />
        </div>
        {legendePoles.length > 0 && vue !== "jour" && (
          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-dark/50">
            {legendePoles.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-[3px] rounded-full" style={{ backgroundColor: couleurPole(p) }} />
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      <HoteDetailJournee registre={registre}>{contenu}</HoteDetailJournee>

      {/* Légende */}
      <div className="mt-5 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card dark:border-white/10 dark:bg-brand-night">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-dark/40">Légende · cliquez sur une case pour voir le détail de la journée</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {[...legende, ...(evenementsAgenda.length > 0 ? legendeAgenda : [])].map((l) => {
            const { className, style } = apparenceEtat(l.etat);
            return (
              <span key={`${l.code}-${l.label}`} className="inline-flex items-center gap-1.5 text-xs text-brand-dark/65">
                <span className={`inline-flex h-5 min-w-[26px] items-center justify-center rounded-md px-1 text-[9px] font-bold ${className}`} style={style}>
                  {l.code}
                </span>
                {l.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );

  // --- Vue JOUR : compteurs, puis une frise 8h-12h / 13h-16h par personne,
  // regroupée par pôle quand tous les pôles sont affichés.
  function vueJour() {
    if (estWeekend(rangeStart)) {
      return (
        <Card className="px-6 py-14 text-center">
          <p className="text-3xl">😎</p>
          <p className="mt-2 text-base font-bold text-brand-dark">C'est le week-end</p>
          <p className="mt-1 text-sm text-brand-dark/50">Personne n'est attendu au bureau ce jour-là.</p>
        </Card>
      );
    }
    const lignes = users
      .map((u) => ({ u, etats: etatsJournee(u, rangeStart) }))
      .filter((l) => l.etats);
    if (lignes.length === 0) {
      return (
        <Card>
          <p className="px-6 py-10 text-center text-sm text-brand-dark/50">Aucun collaborateur actif.</p>
        </Card>
      );
    }
    const compte = { bureau: 0, teletravail: 0, absent: 0, formation: 0, dehors: 0, ferie: 0 };
    for (const l of lignes) compte[categorieJournee(l.etats.matin, l.etats.aprem)]++;
    const tuiles = [
      { cle: "bureau", label: "Au bureau", couleur: ETAT_BUREAU.couleur },
      { cle: "teletravail", label: "Télétravail", couleur: etatTeletravail().couleur },
      { cle: "absent", label: "Absents", couleur: "#DC2626" },
      { cle: "dehors", label: "Réunion, déplacement…", couleur: STATUTS_AGENDA.DEPLACEMENT.couleur },
    ];
    if (compte.formation) tuiles.splice(3, 0, { cle: "formation", label: "En formation", couleur: "#0afe6b" });
    if (compte.ferie) tuiles.push({ cle: "ferie", label: "Férié", couleur: "#94A3B8" });

    const groupes = poleActif
      ? [{ pole: poleActif, lignes }]
      : [...poles, null]
          .map((p) => ({ pole: p, lignes: lignes.filter((l) => (l.u.pole || null) === p) }))
          .filter((g) => g.lignes.length > 0);

    return (
      <>
        <div className={`mb-4 grid grid-cols-2 gap-2.5 ${tuiles.length > 5 ? "sm:grid-cols-6" : tuiles.length > 4 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
          {tuiles.map((t) => (
            <div key={t.cle} className="relative overflow-hidden rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card dark:border-white/10 dark:bg-brand-night">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: t.couleur }} />
              <p className="text-2xl font-bold text-brand-dark">{compte[t.cle]}</p>
              <p className="truncate text-xs font-medium text-brand-dark/55">{t.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {groupes.map((g) => (
            <Card key={g.pole || "aucun"} className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-black/5 px-5 py-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-brand-dark">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: couleurPole(g.pole) || "#94A3B8" }} />
                  {g.pole || "Sans pôle"}
                </span>
                <span className="text-xs text-brand-dark/45">
                  {g.lignes.length} personne{g.lignes.length > 1 ? "s" : ""}
                </span>
              </div>
              <ul className="divide-y divide-black/5">
                {g.lignes.map(({ u, etats }) => (
                  <li key={u.id} className="flex flex-col gap-2.5 px-5 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-4">
                    <span className="flex min-w-0 items-center gap-2.5 sm:w-56 sm:shrink-0">
                      {pastille(u)}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-brand-dark">
                          {u.prenom} {u.nom}
                          {gateau(u)}
                        </span>
                        {u.service && <span className="block truncate text-[11px] text-brand-dark/45">{u.service}</span>}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <FriseJournee refJournee={refJournee(u, rangeStart, etats)} nom={`${u.prenom} ${u.nom}`} matin={etats.matin} aprem={etats.aprem} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </>
    );
  }
}
