import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui";
import { StatusBadge, TypeBadge, Pill } from "@/components/Badges";
import { formatPeriode } from "@/lib/regles";
import { POLES } from "@/lib/poles";


const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const STATUTS = [
  { valeur: "", label: "Tous" },
  { valeur: "EN_ATTENTE", label: "En attente" },
  { valeur: "VALIDE", label: "Validés" },
  { valeur: "REFUSE", label: "Refusés" },
  { valeur: "ANNULE", label: "Annulés" },
];

// Étapes de l'historique, à partir du journal d'audit (qui, quoi, quand).
const ETAPES = {
  DEMANDE_VALIDEE: { label: "Validée", ton: "text-[#16A34A]" },
  DEMANDE_REFUSEE: { label: "Refusée", ton: "text-alert-soft" },
  ANNULATION_DEMANDEE: { label: "Annulation demandée", ton: "text-brand-dark/70" },
  ANNULATION_APPROUVEE: { label: "Annulation acceptée", ton: "text-brand-dark/70" },
  ANNULATION_REFUSEE: { label: "Annulation refusée", ton: "text-brand-dark/70" },
  DEMANDE_ANNULEE: { label: "Retirée par le collaborateur", ton: "text-brand-dark/70" },
};

function moisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, "0")}`;
}
function dateHeure(d) {
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

// Suivi des congés (onglet de « Validation & accès », et de « Mon équipe »
// pour un cadre) : pour chaque demande, le type, la période, le motif, le
// statut et l'historique précis (qui a validé / refusé / annulé, quand, et
// pourquoi). poleImpose : limite au pôle du cadre.
export default async function SuiviConges({ searchParams, poleImpose = null, chemin }) {
  const cadre = !!poleImpose;

  const maintenant = new Date();
  let annee = maintenant.getFullYear();
  let mois = maintenant.getMonth();
  if (/^\d{4}-\d{2}$/.test(searchParams?.mois || "")) {
    const [y, m] = searchParams.mois.split("-").map(Number);
    if (m >= 1 && m <= 12) [annee, mois] = [y, m - 1];
  }
  const statut = STATUTS.some((s) => s.valeur === searchParams?.statut) ? searchParams.statut : "";
  const pole = cadre ? poleImpose : POLES.includes(searchParams?.pole) ? searchParams.pole : "";
  const recherche = typeof searchParams?.q === "string" ? searchParams.q.trim().slice(0, 60) : "";

  const debut = new Date(annee, mois, 1);
  const fin = new Date(annee, mois + 1, 0, 23, 59, 59);

  const demandes = await prisma.leaveRequest.findMany({
    where: {
      dateDebut: { lte: fin },
      dateFin: { gte: debut },
      leaveType: { code: { notIn: ["ec", "TT"] } },
      ...(statut ? { statut } : {}),
      user: {
        ...(pole ? { pole } : {}),
        ...(recherche
          ? { OR: [{ prenom: { contains: recherche, mode: "insensitive" } }, { nom: { contains: recherche, mode: "insensitive" } }] }
          : {}),
      },
    },
    include: {
      user: { select: { prenom: true, nom: true, pole: true } },
      leaveType: true,
      motifFixe: true,
      valideur: { select: { prenom: true, nom: true } },
    },
    orderBy: [{ dateDebut: "asc" }, { createdAt: "asc" }],
    take: 300,
  });

  const journal = demandes.length
    ? await prisma.auditLog.findMany({
        where: { cible: { in: demandes.map((d) => d.id) }, action: { in: Object.keys(ETAPES) } },
        include: { user: { select: { prenom: true, nom: true } } },
        orderBy: { date: "asc" },
      })
    : [];
  const etapesParDemande = new Map();
  for (const e of journal) {
    const liste = etapesParDemande.get(e.cible) || [];
    liste.push(e);
    etapesParDemande.set(e.cible, liste);
  }

  const lien = (changes) => {
    const params = new URLSearchParams({ onglet: "suivi", mois: moisParam(annee, mois), ...(statut ? { statut } : {}), ...(pole && !cadre ? { pole } : {}), ...(recherche ? { q: recherche } : {}), ...changes });
    for (const [k, v] of [...params.entries()]) if (!v) params.delete(k);
    return `${chemin}?${params.toString()}`;
  };
  const precedent = mois === 0 ? moisParam(annee - 1, 11) : moisParam(annee, mois - 1);
  const suivant = mois === 11 ? moisParam(annee + 1, 0) : moisParam(annee, mois + 1);
  const puce = (actif) =>
    `rounded-full border px-3 py-1 text-xs font-semibold ${actif ? "border-brand-dark bg-brand-dark text-brand-cream dark:border-brand-green dark:bg-brand-green dark:text-[#16231a]" : "border-black/10 text-brand-dark/70 hover:bg-black/5"}`;

  return (
    <div>
      <p className="mb-4 text-sm text-brand-dark/60">
        {cadre ? `Demandes du pôle ${pole} : qui a validé, quand et pourquoi.` : "Toutes les demandes : qui a validé, refusé ou annulé, quand et pourquoi."}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={lien({ mois: precedent })}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark">‹</span>
        </Link>
        <span className="min-w-[140px] px-1 text-center text-sm font-semibold text-brand-dark">
          {MOIS[mois].charAt(0).toUpperCase() + MOIS[mois].slice(1)} {annee}
        </span>
        <Link href={lien({ mois: suivant })}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark">›</span>
        </Link>
        <form action={chemin} className="ml-auto flex items-center gap-2">
          <input type="hidden" name="onglet" value="suivi" />
          <input type="hidden" name="mois" value={moisParam(annee, mois)} />
          {statut && <input type="hidden" name="statut" value={statut} />}
          {pole && !cadre && <input type="hidden" name="pole" value={pole} />}
          <input
            name="q"
            defaultValue={recherche}
            placeholder="Rechercher un collaborateur"
            className="w-56 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus-ring outline-none dark:bg-white/5"
          />
        </form>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">Statut</span>
        {STATUTS.map((s) => (
          <Link key={s.valeur || "tous"} href={lien({ statut: s.valeur })} className={puce(statut === s.valeur)}>
            {s.label}
          </Link>
        ))}
      </div>
      {!cadre && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">Pôle</span>
          <Link href={lien({ pole: "" })} className={puce(!pole)}>
            Tous
          </Link>
          {POLES.map((p) => (
            <Link key={p} href={lien({ pole: p })} className={puce(pole === p)}>
              {p}
            </Link>
          ))}
        </div>
      )}

      <Card>
        {demandes.length === 0 ? (
          <EmptyState title="Aucune demande" subtitle="Rien ne correspond à ces filtres pour ce mois." />
        ) : (
          <ul className="divide-y divide-black/5">
            {demandes.map((d) => {
              const etapes = etapesParDemande.get(d.id) || [];
              const motif = d.motifFixe?.libelle || d.motif;
              return (
                <li key={d.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark">
                        {d.user.prenom} {d.user.nom}
                        {d.user.pole && <span className="ml-2 text-xs font-normal text-brand-dark/45">{d.user.pole}</span>}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <TypeBadge leaveType={d.leaveType} />
                        <span className="text-xs text-brand-dark/60">
                          {formatPeriode(d.dateDebut, d.dateFin)}
                          {d.demiJournee ? (d.demiJourneePeriode === "APREM" ? " · après-midi" : " · matin") : ""}
                        </span>
                        {d.exceptionnelle && <Pill tone="yellow">Prioritaire</Pill>}
                        {d.creeParAdmin && <Pill>Ajouté manuellement</Pill>}
                      </div>
                      {motif && (
                        <p className="mt-1.5 text-xs text-brand-dark/70">
                          <span className="font-semibold">Motif :</span> {motif}
                        </p>
                      )}
                    </div>
                    <StatusBadge statut={d.statut} />
                  </div>

                  {/* Historique */}
                  <ol className="mt-3 space-y-1 border-l-2 border-black/10 pl-3 text-xs">
                    <li className="text-brand-dark/50">
                      {d.creeParAdmin ? "Ajoutée" : "Demandée"} le {dateHeure(d.createdAt)}
                      {d.creeParAdmin && d.valideur ? ` par ${d.valideur.prenom} ${d.valideur.nom}` : ""}
                    </li>
                    {etapes.map((e) => (
                      <li key={e.id} className={ETAPES[e.action].ton}>
                        <span className="font-semibold">{ETAPES[e.action].label}</span>
                        {e.user ? ` par ${e.user.prenom} ${e.user.nom}` : ""} le {dateHeure(e.date)}
                        {e.action === "DEMANDE_REFUSEE" && d.commentaireRefus && <span className="text-brand-dark/60"> · « {d.commentaireRefus} »</span>}
                        {e.action === "ANNULATION_DEMANDEE" && d.motifAnnulation && <span className="text-brand-dark/60"> · « {d.motifAnnulation} »</span>}
                      </li>
                    ))}
                    {/* Demandes antérieures au journal : on se rabat sur le valideur enregistré. */}
                    {etapes.length === 0 && !d.creeParAdmin && d.valideur && d.dateValidation && (
                      <li className={d.statut === "REFUSE" ? "text-alert-soft" : "text-[#16A34A]"}>
                        <span className="font-semibold">{d.statut === "REFUSE" ? "Refusée" : d.statut === "ANNULE" ? "Annulée" : "Validée"}</span> par {d.valideur.prenom}{" "}
                        {d.valideur.nom} le {dateHeure(d.dateValidation)}
                        {d.statut === "REFUSE" && d.commentaireRefus && <span className="text-brand-dark/60"> · « {d.commentaireRefus} »</span>}
                      </li>
                    )}
                    {d.statut === "EN_ATTENTE" && <li className="text-brand-dark/40">En attente de traitement</li>}
                  </ol>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {demandes.length === 300 && <p className="mt-3 text-xs text-brand-dark/50">Affichage limité aux 300 premières demandes : affinez avec les filtres.</p>}
    </div>
  );
}
