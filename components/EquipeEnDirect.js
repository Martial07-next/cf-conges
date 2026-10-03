"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function trancheActuelle(date) {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const heurePart = formatter.formatToParts(date).find((part) => part.type === "hour");
  const heure = Number(heurePart?.value);
  const jour = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
  }).format(date);

  if (jour === "sam." || jour === "dim.") return { type: "WEEKEND" };
  if (jour === "ven." && heure >= 17) return { type: "WEEKEND" };

  if (heure >= 8 && heure < 12) return { type: "TRAVAIL", periode: "MATIN" };
  if (heure >= 12 && heure < 13) return { type: "PAUSE" };
  if (heure >= 13 && heure < 17) return { type: "TRAVAIL", periode: "APREM" };
  return { type: "REPOS" };
}

function etatPourPeriode(personne, periode) {
  const req = personne.request;
  if (req && (!req.demiJournee || req.demiJourneePeriode === periode)) {
    if (req.leaveType.code === "TT") return { label: "Télétravail", type: "tt" };
    return { label: req.leaveType.libelle, type: "absence" };
  }
  if (personne.teletravail) return { label: "Télétravail", type: "tt" };
  return { label: "Au bureau", type: "present" };
}

export default function EquipeEnDirect({ personnes, dateLabel }) {
  const router = useRouter();
  const [maintenant, setMaintenant] = useState(() => new Date());
  const [poleActif, setPoleActif] = useState("TOUS");

  useEffect(() => {
    const horlogeId = setInterval(() => setMaintenant(new Date()), 60000);
    const donneesId = setInterval(() => router.refresh(), 5 * 60 * 1000);

    return () => {
      clearInterval(horlogeId);
      clearInterval(donneesId);
    };
  }, [router]);

  const poles = useMemo(() => [...new Set(personnes.map((p) => p.pole).filter(Boolean))], [personnes]);
  const personnesFiltrees = useMemo(() => poleActif === "TOUS" ? personnes : personnes.filter((p) => p.pole === poleActif), [personnes, poleActif]);

  const tranche = trancheActuelle(maintenant);
  const periode = tranche.type === "TRAVAIL" ? tranche.periode : "MATIN";
  const lignes = useMemo(
    () => personnesFiltrees.map((p) => ({ ...p, etat: etatPourPeriode(p, periode) })),
    [personnesFiltrees, periode]
  );

  const compteurs = lignes.reduce(
    (acc, p) => {
      acc[p.etat.type] += 1;
      return acc;
    },
    { present: 0, tt: 0, absence: 0 }
  );

  const heure = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(maintenant);

  return (
    <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-brand-night shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-green" />
              </span>
              <h2 className="font-bold text-brand-dark">Équipe  en direct</h2>
            </div>
            <p className="mt-1 text-xs text-brand-dark/45">État actuel de l'équipe · actualisation automatique</p>
          </div>
          <div className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-semibold text-brand-dark/60">{heure}</div>
        </div>

        {tranche.type === "TRAVAIL" && (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPoleActif("TOUS")} className={poleActif === "TOUS" ? "rounded-full border border-[#fff200] bg-[#fff200] px-3 py-1.5 text-xs font-bold text-[#16231a] shadow-sm" : "rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#16231a] shadow-sm hover:border-[#6cb64d] dark:border-white/25 dark:bg-white/15 dark:text-white"}>Tous</button>
              {poles.map((pole) => <button key={pole} type="button" onClick={() => setPoleActif(pole)} className={poleActif === pole ? "rounded-full border border-[#fff200] bg-[#fff200] px-3 py-1.5 text-xs font-bold text-[#16231a] shadow-sm" : "rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#16231a] shadow-sm hover:border-[#6cb64d] dark:border-white/25 dark:bg-white/15 dark:text-white"}>{pole}</button>)}
            </div>
            <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-green/15 px-3 py-1.5 text-xs font-semibold text-brand-greendark">● {compteurs.present} au bureau</span>
            {compteurs.tt > 0 && (
              <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-brand-dark">⌂ {compteurs.tt} en télétravail</span>
            )}
            {compteurs.absence > 0 && (
              <span className="rounded-full bg-brand-yellow/20 px-3 py-1.5 text-xs font-semibold text-brand-dark">○ {compteurs.absence} absent{compteurs.absence > 1 ? "s" : ""}</span>
            )}
            </div>
          </div>
        )}
      </div>

      {tranche.type === "WEEKEND" ? (
        <div className="px-6 py-8 text-center">
          <p className="text-lg font-bold text-brand-dark">C’est le week-end, les congés aussi prennent une pause 😎</p>
          <p className="mt-1 text-xs text-brand-dark/45">L’équipe en direct revient lundi à 8h</p>
        </div>
      ) : tranche.type === "PAUSE" ? (
        <div className="px-6 py-8 text-center">
          <p className="text-lg font-bold text-brand-dark">Bon appétit chacal ! 🍽️</p>
          <p className="mt-1 text-xs text-brand-dark/45">Pause déjeuner · retour à 13h</p>
        </div>
      ) : tranche.type === "REPOS" ? (
        <div className="px-6 py-8 text-center">
          <p className="text-lg font-bold text-brand-dark">T’as bien travaillé, maintenant dodo ! 😴</p>
          <p className="mt-1 text-xs text-brand-dark/45">L’équipe en direct revient à 8h</p>
        </div>
      ) : (
        <ul className="divide-y divide-black/5">
        {lignes.map((p) => (
          <li key={p.id} className="px-4 py-2.5">
            <div className="grid grid-cols-[minmax(120px,1fr)_minmax(170px,1.3fr)] items-center gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-brand-dark">{p.nom}</div>
                <div className="mt-0.5 text-[11px] text-brand-dark/40">{periode === "MATIN" ? "Ce matin" : "Cet après-midi"}</div>
              </div>
              <span
                className={`inline-flex min-h-8 w-full items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  p.etat.type === "present"
                    ? "bg-brand-green/15 text-brand-greendark"
                    : p.etat.type === "tt"
                      ? "bg-black/5 text-brand-dark"
                      : "bg-brand-yellow/20 text-brand-dark"
                }`}
              >
                {p.etat.label}
              </span>
            </div>
          </li>
        ))}
        </ul>
      )}
    </div>
  );
}
