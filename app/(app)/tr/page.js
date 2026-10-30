import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess, canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { TuileIcone } from "@/components/Icone";
import { COULEUR_TELETRAVAIL } from "@/lib/etatJournee";
import { calculerTicketsRestau, calculerDetailTicketsRestauMois } from "@/lib/ticketsRestau";
import TRRegularisationForm from "@/components/TRRegularisationForm";
import RegularisationBadge from "@/components/RegularisationBadge";
import MarquerLivreButton from "@/components/MarquerLivreButton";
import TRMoisPicker from "@/components/TRMoisPicker";
import ForcerVueMobile from "@/components/ForcerVueMobile";
import TRPoleFilter from "@/components/TRPoleFilter";
import { POLES_TICKETS_RESTAU, couleurPole } from "@/lib/poles";

export const dynamic = "force-dynamic";

const SOCIETE_DEBUT = new Date(2021, 6, 1); // création de CF Réseaux : 1er juillet 2021
const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_LONGS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

// Trait de couleur discret à gauche du nom pour repérer le pôle, affiché
// seulement quand tous les pôles sont visibles (comme le planning équipe).
function traitPole(u, filtrePole) {
  const couleur = !filtrePole && couleurPole(u.pole);
  return couleur ? { boxShadow: `inset 3px 0 0 ${couleur}` } : undefined;
}

// Initiales dans la couleur du pôle (comme le planning équipe).
function Pastille({ u }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0E1712]"
      style={{ backgroundColor: couleurPole(u.pole) || "#0afe6b" }}
      aria-hidden
    >
      {`${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase()}
    </span>
  );
}

function NavFleche({ href, children, label }) {
  return (
    <Link href={href} aria-label={label} prefetch={false}>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#EBF0E8] hover:bg-white/10 focus-ring">{children}</span>
    </Link>
  );
}

// Bandeau sombre (même style que le planning équipe).
function Bandeau({ sousTitre, children }) {
  return (
    <section className="relative mb-4 overflow-hidden rounded-2xl bg-[#0E1712] text-[#EBF0E8] shadow-[0_12px_40px_-24px_rgba(10,254,107,0.45)] md:mt-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#0afe6b]/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TuileIcone name="tr" sombre />
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight sm:text-lg">Gestionnaire TR</h1>
            <p className="truncate text-xs text-[#EBF0E8]/55">{sousTitre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </section>
  );
}

function OngletsVue({ vue, hrefSemaines, hrefAnnee }) {
  const onglets = [
    { cle: "semaines", label: "Par semaines", href: hrefSemaines, mobile: true },
    { cle: "annee", label: "Annuelle", href: hrefAnnee, mobile: false },
  ];
  return (
    <div className="inline-flex gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/10">
      {onglets.map((o) => (
        <Link key={o.cle} href={o.href} prefetch={false} className={o.mobile ? "" : "hidden md:inline-block"}>
          <span
            className={`inline-block rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              vue === o.cle ? "bg-white text-brand-dark shadow-sm dark:bg-brand-night" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            {o.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function Tuile({ valeur, label, couleur }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card dark:border-white/10 dark:bg-brand-night">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: couleur }} />
      <p className="text-2xl font-bold text-brand-dark">{valeur}</p>
      <p className="truncate text-xs font-medium text-brand-dark/55">{label}</p>
    </div>
  );
}

function euros(n) {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function toMoisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, "0")}`;
}

export default async function TicketsRestauPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "tr")) redirect("/dashboard");

  // Export du mois livre : gestionnaire TR, employeur et administrateur.
  const peutExporter =
    ["EMPLOYEUR", "ADMIN"].includes(session.user.role) || canAccessAny(session.user, ["tr", "employeur", "admin"]);

  const vue = searchParams?.vue === "annee" ? "annee" : "semaines";
  // Filtre par pôle (optionnel), conservé dans toute la navigation de la page.
  const pole = POLES_TICKETS_RESTAU.includes(searchParams?.pole) ? searchParams.pole : "";
  const filtrePole = pole ? `&pole=${encodeURIComponent(pole)}` : "";
  const annee = searchParams?.annee && /^\d{4}$/.test(searchParams.annee) ? parseInt(searchParams.annee, 10) : new Date().getFullYear();

  const now = new Date();
  let moisAnnee = now.getFullYear();
  let moisIndex = now.getMonth();
  if (searchParams?.mois && /^\d{4}-\d{2}$/.test(searchParams.mois)) {
    const [y, m] = searchParams.mois.split("-").map(Number);
    moisAnnee = y;
    moisIndex = m - 1;
  }

  // Bloque tout acces a une periode anterieure a la creation de la societe,
  // meme via une URL tapee a la main ou le selecteur de mois/annee.
  if (vue === "annee" && annee < SOCIETE_DEBUT.getFullYear()) {
    redirect(`/tr?vue=annee&annee=${SOCIETE_DEBUT.getFullYear()}${filtrePole}`);
  }
  if (vue === "semaines") {
    const finMoisDemande = new Date(moisAnnee, moisIndex + 1, 0);
    if (finMoisDemande < SOCIETE_DEBUT) {
      redirect(`/tr?vue=semaines&mois=${toMoisParam(SOCIETE_DEBUT.getFullYear(), SOCIETE_DEBUT.getMonth())}${filtrePole}`);
    }
  }

    const usersBruts = await prisma.user.findMany({
    // Les Employeurs / RH n'ont pas de tickets restaurant.
    where: { visiblePlanning: true, role: { not: "EMPLOYEUR" } },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
  });

  // Meme regle que le planning equipe : visible a partir du mois d'embauche,
  // jusqu'a la fin du mois de depart (historique garde), puis disparait a
  // partir du mois suivant. La vue annuelle utilise l'annee affichee comme
  // periode de reference ; la vue par semaines utilise le mois affiche.
  const referenceDebutPeriode = vue === "annee" ? new Date(annee, 0, 1) : new Date(moisAnnee, moisIndex, 1);
  const referenceFinPeriode = vue === "annee" ? new Date(annee, 11, 31, 23, 59, 59) : new Date(moisAnnee, moisIndex + 1, 0, 23, 59, 59);
  function visibleSurCettePeriode(u) {
    if (u.statutCompte !== "ACTIF" && !u.dateSortie) return false;

    if (u.dateEntree) {
      const entree = new Date(u.dateEntree);
      const debutMoisEntree = new Date(entree.getFullYear(), entree.getMonth(), 1);
      if (referenceFinPeriode < debutMoisEntree) return false;
    }

    if (!u.dateSortie) return true;
    const sortie = new Date(u.dateSortie);
    const finMoisSortie = new Date(sortie.getFullYear(), sortie.getMonth() + 1, 0, 23, 59, 59);
    return referenceDebutPeriode <= finMoisSortie;
  }
  const users = usersBruts.filter(visibleSurCettePeriode).filter((u) => !pole || u.pole === pole);

  const props = { users, filtrePole, pole };
  return (
    <div>
      <ForcerVueMobile vueActuelle={vue} vueABloquer="annee" urlCible={`/tr?vue=semaines&mois=${toMoisParam(moisAnnee, moisIndex)}${filtrePole}`} />
      {vue === "semaines" ? (
        <VueSemaines {...props} annee={moisAnnee} mois={moisIndex} anneeAnnuelle={annee} peutExporter={peutExporter} />
      ) : (
        <VueAnnuelle {...props} annee={annee} moisAnnee={moisAnnee} moisIndex={moisIndex} />
      )}
    </div>
  );
}

function sousTitre(users, pole) {
  return `${users.length} collaborateur${users.length > 1 ? "s" : ""}${pole ? ` · ${pole}` : ""} · 10 € par jour travaillé en entreprise`;
}

// Case d'un jour dans le tableau du mois.
function CaseTicket({ u, info }) {
  const base = "inline-flex h-6 w-full items-center justify-center rounded-md text-[9px] font-bold";
  if (info?.etat === "avant_embauche") return <span title="Avant l'entrée dans l'entreprise" className={base} />;
  if (info?.etat === "apres_depart") return <span title="Après la sortie de l'entreprise" className={base} />;
  if (info?.etat === "regularise") {
    return (
      <RegularisationBadge
        userId={u.id}
        dateISO={info.dateISO}
        dateLabel={info.dateLabel}
        commentaire={info.commentaire}
        createdByLabel={info.createdByLabel}
        canEdit
      />
    );
  }
  if (info?.etat === "ferie") {
    return (
      <span title={info.libelle} className={`${base} bg-black/5 text-brand-dark/45`}>
        JF
      </span>
    );
  }
  if (info?.etat === "ferie_travaille") {
    return (
      <span title={`${info.libelle} travaillé (accepté)`} className={`${base} bg-[#EAB308] text-[#422006]`}>
        FT
      </span>
    );
  }
  if (info?.etat === "conge") {
    const couleur = info.leaveType.code === "TT" ? COULEUR_TELETRAVAIL : info.leaveType.couleur;
    return (
      <span title={info.leaveType.libelle} className={`${base} text-white`} style={{ backgroundColor: couleur }}>
        {info.leaveType.code}
      </span>
    );
  }
  return (
    <span title="Ticket restaurant gagné" className={`${base} bg-brand-green/20 text-[12px] font-black text-[#15803D] dark:text-brand-green`}>
      ✓
    </span>
  );
}

async function VueSemaines({ users, annee, mois, anneeAnnuelle, peutExporter, filtrePole, pole }) {
  const [{ jours, semainesLabels, details }, livraison] = await Promise.all([
    calculerDetailTicketsRestauMois(users, annee, mois),
    prisma.ticketRestauLivraison.findUnique({ where: { annee_mois: { annee, mois } } }),
  ]);

  const prevMois = mois === 0 ? 11 : mois - 1;
  const prevAnnee = mois === 0 ? annee - 1 : annee;
  const nextMois = mois === 11 ? 0 : mois + 1;
  const nextAnnee = mois === 11 ? annee + 1 : annee;
  const now = new Date();
  const moisCourant = toMoisParam(now.getFullYear(), now.getMonth());
  const aujourdhui = now.toDateString();

  const totaux = Object.fromEntries(users.map((u) => [u.id, jours.filter((j) => details[u.id][j.toDateString()]?.etat === "ticket").length]));
  const totalMois = Object.values(totaux).reduce((a, b) => a + b, 0);
  const parJour = jours.map((j) => users.filter((u) => details[u.id][j.toDateString()]?.etat === "ticket").length);

  return (
    <>
      <Bandeau sousTitre={sousTitre(users, pole)}>
        <NavFleche href={`/tr?vue=semaines&mois=${toMoisParam(prevAnnee, prevMois)}${filtrePole}`} label="Mois précédent">‹</NavFleche>
        <span className="min-w-[130px] px-1 text-center text-sm font-semibold">
          {MOIS_LONGS[mois]} {annee}
        </span>
        <NavFleche href={`/tr?vue=semaines&mois=${toMoisParam(nextAnnee, nextMois)}${filtrePole}`} label="Mois suivant">›</NavFleche>
        <TRMoisPicker currentMois={toMoisParam(annee, mois)} filtrePole={filtrePole} sombre />
        <Link prefetch={false} href={`/tr?vue=semaines&mois=${moisCourant}${filtrePole}`} className="whitespace-nowrap rounded-lg bg-[#0afe6b] px-3 py-1.5 text-xs font-bold text-[#0E1712] transition hover:bg-[#3dff8c]">
          Ce mois-ci
        </Link>
      </Bandeau>

      {/* Barre d'outils */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2.5 shadow-card dark:border-white/10 dark:bg-brand-night">
        <OngletsVue vue="semaines" hrefSemaines={`/tr?vue=semaines&mois=${toMoisParam(annee, mois)}${filtrePole}`} hrefAnnee={`/tr?vue=annee&annee=${anneeAnnuelle}${filtrePole}`} />
        <TRPoleFilter pole={pole} poles={POLES_TICKETS_RESTAU} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <TRRegularisationForm />
          {livraison ? (
            peutExporter && (
              <a
                href={`/api/tr-export?mois=${toMoisParam(annee, mois)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-black/5"
              >
                Exporter (Excel)
              </a>
            )
          ) : (
            <MarquerLivreButton annee={annee} mois={mois} />
          )}
        </div>
      </div>

      {/* Chiffres du mois */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tuile valeur={totalMois} label={`ticket${totalMois > 1 ? "s" : ""} en ${MOIS_LONGS[mois].toLowerCase()}`} couleur="#0afe6b" />
        <Tuile valeur={euros(totalMois * 10)} label="valeur totale" couleur="#16A34A" />
        <Tuile valeur={euros(totalMois * 6)} label="part employeur (6 € / ticket)" couleur={COULEUR_TELETRAVAIL} />
        <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card dark:border-white/10 dark:bg-brand-night">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: livraison ? "#16A34A" : "#EAB308" }} />
          <p className={`text-base font-bold ${livraison ? "text-[#15803D] dark:text-brand-green" : "text-brand-dark"}`}>{livraison ? "✓ Livrés" : "À livrer"}</p>
          <p className="truncate text-xs font-medium text-brand-dark/55">
            {livraison ? `le ${new Date(livraison.livreLe).toLocaleDateString("fr-FR")}` : "pas encore marqués comme livrés"}
          </p>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-10 min-w-[190px] border-b border-black/5 bg-white px-4 py-3 text-left align-bottom font-semibold text-brand-dark/70">
                Collaborateur
              </th>
              {semainesLabels.map((sem, i) => (
                <th key={i} colSpan={sem.span} className="border-b border-l border-black/5 bg-black/[0.02] px-2 py-2 text-center text-[11px] font-semibold text-brand-dark/50">
                  {sem.label}
                </th>
              ))}
              <th rowSpan={2} className="min-w-[70px] border-b border-l border-black/5 px-4 py-3 text-center align-bottom font-bold text-brand-dark">
                Total
              </th>
            </tr>
            <tr>
              {jours.map((j, i) => {
                const nouvelleSemaine = i === 0 || j.getDay() === 1;
                const estAujourdhui = j.toDateString() === aujourdhui;
                return (
                  <th
                    key={j.toISOString()}
                    className={`min-w-[36px] border-b border-black/5 px-1 py-2 text-center font-medium text-brand-dark/60 ${nouvelleSemaine ? "border-l" : ""} ${estAujourdhui ? "bg-brand-green/10" : ""}`}
                  >
                    <div className="text-[9px] uppercase">{JOURS_COURTS[j.getDay() - 1]}</div>
                    <div>
                      {estAujourdhui ? <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-green px-1 font-bold text-[#0E1712]">{j.getDate()}</span> : j.getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-black/5 transition-colors last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.03]">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-brand-dark" style={traitPole(u, filtrePole)} title={u.pole || undefined}>
                  <span className="flex items-center gap-2">
                    <Pastille u={u} />
                    {u.prenom} {u.nom}
                  </span>
                </td>
                {jours.map((j, i) => {
                  const nouvelleSemaine = i === 0 || j.getDay() === 1;
                  return (
                    <td
                      key={j.toISOString()}
                      className={`px-0.5 py-2 text-center ${nouvelleSemaine ? "border-l border-black/5" : ""} ${j.toDateString() === aujourdhui ? "bg-brand-green/[0.07]" : ""}`}
                    >
                      <CaseTicket u={u} info={details[u.id][j.toDateString()]} />
                    </td>
                  );
                })}
                <td className="border-l border-black/5 px-3 py-2 text-center">
                  <span className="inline-flex min-w-[34px] justify-center rounded-full bg-brand-green/15 px-2 py-1 text-sm font-bold text-brand-dark">{totaux[u.id]}</span>
                </td>
              </tr>
            ))}
          </tbody>
          {users.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-black/10 bg-black/[0.02]">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-brand-dark/50">Total du jour</td>
                {parJour.map((n, i) => (
                  <td key={i} className={`px-0.5 py-2.5 text-center text-[11px] font-semibold text-brand-dark/60 ${i === 0 || jours[i].getDay() === 1 ? "border-l border-black/5" : ""}`}>
                    {n}
                  </td>
                ))}
                <td className="border-l border-black/5 px-3 py-2.5 text-center text-sm font-bold text-brand-dark">{totalMois}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      <LegendeTR />
    </>
  );
}

function LegendeTR() {
  const items = [
    { code: "✓", label: "Ticket gagné", className: "bg-brand-green/20 text-[#15803D] dark:text-brand-green" },
    { code: "CP", label: "Congé ou absence (couleur du type)", style: { backgroundColor: "#16A34A" }, className: "text-white" },
    { code: "Rég.", label: "Régularisation (repas payé)", className: "bg-alert-soft text-white" },
    { code: "JF", label: "Férié", className: "bg-black/5 text-brand-dark/45" },
    { code: "FT", label: "Férié travaillé", className: "bg-[#EAB308] text-[#422006]" },
  ];
  return (
    <div className="mt-5 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card dark:border-white/10 dark:bg-brand-night">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-dark/40">Légende</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-brand-dark/65">
            <span className={`inline-flex h-5 min-w-[26px] items-center justify-center rounded-md px-1 text-[9px] font-bold ${l.className}`} style={l.style}>
              {l.code}
            </span>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

async function VueAnnuelle({ users, annee, moisAnnee, moisIndex, filtrePole, pole }) {
  const resultats = await calculerTicketsRestau(users, annee);
  const now = new Date();
  const lignes = users.map((u) => {
    const mois = resultats[u.id] || Array(12).fill(0);
    return { u, mois, total: mois.reduce((a, b) => a + b, 0) };
  });
  const totalAnnee = lignes.reduce((a, l) => a + l.total, 0);
  const parMois = MOIS_COURTS.map((_, i) => lignes.reduce((a, l) => a + l.mois[i], 0));
  const max = Math.max(1, ...lignes.flatMap((l) => l.mois));

  return (
    <>
      <Bandeau sousTitre={sousTitre(users, pole)}>
        <NavFleche href={`/tr?vue=annee&annee=${annee - 1}${filtrePole}`} label="Année précédente">‹</NavFleche>
        <span className="min-w-[70px] px-1 text-center text-sm font-semibold">{annee}</span>
        <NavFleche href={`/tr?vue=annee&annee=${annee + 1}${filtrePole}`} label="Année suivante">›</NavFleche>
        <Link prefetch={false} href={`/tr?vue=annee&annee=${now.getFullYear()}${filtrePole}`} className="whitespace-nowrap rounded-lg bg-[#0afe6b] px-3 py-1.5 text-xs font-bold text-[#0E1712] transition hover:bg-[#3dff8c]">
          Cette année
        </Link>
      </Bandeau>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2.5 shadow-card dark:border-white/10 dark:bg-brand-night">
        <OngletsVue vue="annee" hrefSemaines={`/tr?vue=semaines&mois=${toMoisParam(moisAnnee, moisIndex)}${filtrePole}`} hrefAnnee={`/tr?vue=annee&annee=${annee}${filtrePole}`} />
        <TRPoleFilter pole={pole} poles={POLES_TICKETS_RESTAU} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Tuile valeur={totalAnnee} label={`tickets en ${annee}`} couleur="#0afe6b" />
        <Tuile valeur={euros(totalAnnee * 10)} label="valeur totale" couleur="#16A34A" />
        <Tuile valeur={euros(totalAnnee * 6)} label="part employeur (6 € / ticket)" couleur={COULEUR_TELETRAVAIL} />
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs font-semibold text-brand-dark/50">
              <th className="sticky left-0 z-10 min-w-[190px] bg-white px-4 py-3">Collaborateur</th>
              {MOIS_COURTS.map((m, i) => (
                <th key={m} className={`min-w-[46px] px-2 py-3 text-center ${annee === now.getFullYear() && i === now.getMonth() ? "bg-brand-green/10 text-brand-dark" : ""}`}>
                  {m}
                </th>
              ))}
              <th className="border-l border-black/5 px-4 py-3 text-center font-bold text-brand-dark">Total</th>
              <th className="px-4 py-3 text-center font-bold text-brand-dark">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ u, mois, total }) => (
              <tr key={u.id} className="border-b border-black/5 transition-colors last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.03]">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-brand-dark" style={traitPole(u, filtrePole)} title={u.pole || undefined}>
                  <span className="flex items-center gap-2">
                    <Pastille u={u} />
                    {u.prenom} {u.nom}
                  </span>
                </td>
                {mois.map((n, i) => (
                  <td key={i} className={`px-1 py-2 text-center ${annee === now.getFullYear() && i === now.getMonth() ? "bg-brand-green/[0.07]" : ""}`}>
                    {n > 0 ? (
                      <span
                        className="inline-flex h-6 w-full min-w-[34px] items-center justify-center rounded-md text-[11px] font-semibold text-brand-dark"
                        style={{ backgroundColor: `rgba(10, 254, 107, ${(0.12 + (n / max) * 0.4).toFixed(2)})` }}
                      >
                        {n}
                      </span>
                    ) : (
                      <span className="text-brand-dark/25">·</span>
                    )}
                  </td>
                ))}
                <td className="border-l border-black/5 px-3 py-2 text-center">
                  <span className="inline-flex min-w-[34px] justify-center rounded-full bg-brand-green/15 px-2 py-1 text-sm font-bold text-brand-dark">{total}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-center font-bold text-[#15803D] dark:text-brand-green">{euros(total * 10)}</td>
              </tr>
            ))}
          </tbody>
          {lignes.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-black/10 bg-black/[0.02]">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-brand-dark/50">Total du mois</td>
                {parMois.map((n, i) => (
                  <td key={i} className="px-1 py-2.5 text-center text-[11px] font-semibold text-brand-dark/60">
                    {n}
                  </td>
                ))}
                <td className="border-l border-black/5 px-3 py-2.5 text-center text-sm font-bold text-brand-dark">{totalAnnee}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-center text-sm font-bold text-[#15803D] dark:text-brand-green">{euros(totalAnnee * 10)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </>
  );
}
