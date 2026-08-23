import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { calculerTicketsRestau, calculerDetailTicketsRestauMois } from "@/lib/ticketsRestau";
import TRRegularisationForm from "@/components/TRRegularisationForm";
import RegularisationBadge from "@/components/RegularisationBadge";
import MarquerLivreButton from "@/components/MarquerLivreButton";
import TRMoisPicker from "@/components/TRMoisPicker";

export const dynamic = "force-dynamic";

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_LONGS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

function toMoisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, "0")}`;
}

export default async function TicketsRestauPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "tr")) redirect("/dashboard");

  const vue = searchParams?.vue === "annee" ? "annee" : "semaines";
  const annee = searchParams?.annee && /^\d{4}$/.test(searchParams.annee) ? parseInt(searchParams.annee, 10) : new Date().getFullYear();

  const now = new Date();
  let moisAnnee = now.getFullYear();
  let moisIndex = now.getMonth();
  if (searchParams?.mois && /^\d{4}-\d{2}$/.test(searchParams.mois)) {
    const [y, m] = searchParams.mois.split("-").map(Number);
    moisAnnee = y;
    moisIndex = m - 1;
  }

  const usersBruts = await prisma.user.findMany({
    where: { visiblePlanning: true },
    orderBy: { nom: "asc" },
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
  const users = usersBruts.filter(visibleSurCettePeriode);

  return (
    <div>
      <PageHeader
        title="Gestionnaire TR"
        subtitle="Tickets restaurant cumulés par collaborateur — 10€ / jour travaillé en entreprise."
      />

      <TRRegularisationForm />

      {vue === "semaines" ? (
        <VueSemaines users={users} annee={moisAnnee} mois={moisIndex} anneeAnnuelle={annee} />
      ) : (
        <VueAnnuelle users={users} annee={annee} moisAnnee={moisAnnee} moisIndex={moisIndex} />
      )}
    </div>
  );
}

async function VueSemaines({ users, annee, mois, anneeAnnuelle }) {
  const [{ jours, semainesLabels, details }, livraison] = await Promise.all([
    calculerDetailTicketsRestauMois(users, annee, mois),
    prisma.ticketRestauLivraison.findUnique({ where: { annee_mois: { annee, mois } } }),
  ]);

  const prevMois = mois === 0 ? 11 : mois - 1;
  const prevAnnee = mois === 0 ? annee - 1 : annee;
  const nextMois = mois === 11 ? 0 : mois + 1;
  const nextAnnee = mois === 11 ? annee + 1 : annee;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Link href={`/tr?vue=semaines&mois=${toMoisParam(prevAnnee, prevMois)}`}>
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
          </Link>
          <span className="text-sm font-semibold text-brand-dark min-w-[160px] text-center">
            {MOIS_LONGS[mois]} {annee}
          </span>
          <Link href={`/tr?vue=semaines&mois=${toMoisParam(nextAnnee, nextMois)}`}>
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
          </Link>
          <TRMoisPicker currentMois={toMoisParam(annee, mois)} />
        </div>
        <div className="inline-flex bg-black/5 rounded-xl p-1 gap-1">
          <span className="inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-white text-brand-dark shadow-sm">
            Vue par semaines
          </span>
          <Link href={`/tr?vue=annee&annee=${anneeAnnuelle}`}>
            <span className="inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold text-brand-dark/50 hover:text-brand-dark transition-colors">
              Vue annuelle
            </span>
          </Link>
        </div>
      </div>

      <div className="mb-5">
        {livraison ? (
          <span className="text-xs font-semibold text-brand-greendark bg-brand-greendark/10 px-3 py-1.5 rounded-full">
            ✓ Livré depuis le {new Date(livraison.livreLe).toLocaleDateString("fr-FR")}
          </span>
        ) : (
          <MarquerLivreButton annee={annee} mois={mois} />
        )}
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 bg-white z-10 text-left px-4 py-3 font-semibold text-brand-dark/70 min-w-[170px] border-b border-black/5 align-bottom">
                Collaborateur
              </th>
              {semainesLabels.map((s, i) => (
                <th key={i} colSpan={s.span} className="px-2 py-2 text-center font-semibold text-brand-dark/50 border-b border-l border-black/5 bg-black/[0.02]">
                  {s.label}
                </th>
              ))}
              <th rowSpan={2} className="px-4 py-3 text-center font-bold border-b border-black/5 align-bottom min-w-[70px]">
                Total mois
              </th>
            </tr>
            <tr>
              {jours.map((j, i) => {
                const nouvelleSemaine = i === 0 || j.getDay() === 1;
                return (
                  <th
                    key={j.toISOString()}
                    className={`px-1.5 py-2 text-center font-medium text-brand-dark/60 border-b border-black/5 min-w-[34px] ${nouvelleSemaine ? "border-l" : ""}`}
                  >
                    <div className="text-[9px]">{JOURS_COURTS[j.getDay() - 1]}</div>
                    <div>{j.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const total = jours.filter((j) => details[u.id][j.toDateString()]?.etat === "ticket").length;
              return (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="sticky left-0 bg-white z-10 px-4 py-2.5 font-medium text-brand-dark whitespace-nowrap">
                    {u.prenom} {u.nom}
                  </td>
                  {jours.map((j, i) => {
                    const info = details[u.id][j.toDateString()];
                    const nouvelleSemaine = i === 0 || j.getDay() === 1;
                    return (
                      <td key={j.toISOString()} className={`px-1 py-2 text-center ${nouvelleSemaine ? "border-l border-black/5" : ""}`}>
                        {info?.etat === "avant_embauche" ? (
                          <span title="Avant l'entrée dans l'entreprise" className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] text-brand-dark/20">
                            —
                          </span>
                        ) : info?.etat === "apres_depart" ? (
                          <span title="Après la sortie de l'entreprise" className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] text-brand-dark/20">
                            —
                          </span>
                        ) : info?.etat === "regularise" ? (
                          <RegularisationBadge
                            userId={u.id}
                            dateISO={info.dateISO}
                            dateLabel={info.dateLabel}
                            commentaire={info.commentaire}
                            createdByLabel={info.createdByLabel}
                            canEdit
                          />
                        ) : info?.etat === "ferie" ? (
                          <span
                            title={info.libelle}
                            className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-brand-dark/50 bg-black/5"
                          >
                            Férié
                          </span>
                        ) : info?.etat === "ferie_travaille" ? (
                          <span
                            title={`${info.libelle} — travaillé (accepté)`}
                            className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-white bg-brand-yellow"
                          >
                            FT
                          </span>
                        ) : info?.etat === "conge" ? (
                          <span
                            title={info.leaveType.libelle}
                            className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: info.leaveType.couleur }}
                          >
                            {info.leaveType.code}
                          </span>
                        ) : (
                          <span
                            title="Ticket restaurant gagné"
                            className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-white bg-brand-green"
                          >
                            ✓
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-center font-bold text-brand-dark">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

async function VueAnnuelle({ users, annee, moisAnnee, moisIndex }) {
  const resultats = await calculerTicketsRestau(users, annee);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Link href={`/tr?vue=annee&annee=${annee - 1}`}>
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
          </Link>
          <span className="text-sm font-semibold text-brand-dark min-w-[60px] text-center">{annee}</span>
          <Link href={`/tr?vue=annee&annee=${annee + 1}`}>
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
          </Link>
        </div>
        <div className="inline-flex bg-black/5 rounded-xl p-1 gap-1">
          <Link href={`/tr?vue=semaines&mois=${toMoisParam(moisAnnee, moisIndex)}`}>
            <span className="inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold text-brand-dark/50 hover:text-brand-dark transition-colors">
              Vue par semaines
            </span>
          </Link>
          <span className="inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-white text-brand-dark shadow-sm">
            Vue annuelle
          </span>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-xs font-semibold text-brand-dark/50 border-b border-black/5">
              <th className="sticky left-0 bg-white z-10 px-4 py-3 min-w-[170px]">Collaborateur</th>
              {MOIS_COURTS.map((m) => (
                <th key={m} className="px-2 py-3 text-center min-w-[46px]">
                  {m}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-bold">Total</th>
              <th className="px-4 py-3 text-center font-bold">Valeur (€)</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const mois = resultats[u.id] || Array(12).fill(0);
              const total = mois.reduce((a, b) => a + b, 0);
              return (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="sticky left-0 bg-white z-10 px-4 py-2.5 font-medium text-brand-dark whitespace-nowrap">
                    {u.prenom} {u.nom}
                  </td>
                  {mois.map((n, i) => (
                    <td key={i} className="px-2 py-2.5 text-center text-brand-dark/70">
                      {n}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-center font-bold text-brand-dark">{total}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-brand-greendark">{(total * 10).toFixed(2)} €</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
