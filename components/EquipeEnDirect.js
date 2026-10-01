"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function periodeActuelle(date) {
  const heure = Number(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hour12: false,
    }).format(date)
  );
  return heure < 13 ? "MATIN" : "APREM";
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

  useEffect(() => {
    const horlogeId = setInterval(() => setMaintenant(new Date()), 60000);
    const donneesId = setInterval(() => router.refresh(), 5 * 60 * 1000);

    return () => {
      clearInterval(horlogeId);
      clearInterval(donneesId);
    };
  }, [router]);

  const periode = periodeActuelle(maintenant);
  const lignes = useMemo(
    () => personnes.map((p) => ({ ...p, etat: etatPourPeriode(p, periode) })),
    [personnes, periode]
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
    <div className="rounded-3xl border border-black/5 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-green" />
              </span>
              <h2 className="font-bold text-brand-dark">Équipe — en direct</h2>
            </div>
            <p className="mt-1 text-xs text-brand-dark/45">État actuel de l'équipe · actualisation automatique</p>
          </div>
          <div className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-semibold text-brand-dark/60">{heure}</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-brand-green/15 px-3 py-1.5 text-xs font-semibold text-brand-greendark">● {compteurs.present} au bureau</span>
          {compteurs.tt > 0 && (
            <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-brand-dark">⌂ {compteurs.tt} en télétravail</span>
          )}
          {compteurs.absence > 0 && (
            <span className="rounded-full bg-brand-yellow/20 px-3 py-1.5 text-xs font-semibold text-brand-dark">○ {compteurs.absence} absent{compteurs.absence > 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

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
    </div>
  );
}
