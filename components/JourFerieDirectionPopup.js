"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JourFerieOuvertureActions from "./JourFerieOuvertureActions";

// Pop-up pour le compte chargé des jours fériés : un férié approche sans
// décision. "Plus tard" la masque jusqu'à la prochaine ouverture du site.
export default function JourFerieDirectionPopup() {
  const [ferie, setFerie] = useState(null);

  useEffect(() => {
    fetch("/api/jours-feries/ouverture")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        try {
          if (sessionStorage.getItem(`cf-ferie-direction-plus-tard-${data.date}`)) return;
        } catch {}
        setFerie(data);
      })
      .catch(() => {});
  }, []);

  if (!ferie) return null;

  function plusTard() {
    try {
      sessionStorage.setItem(`cf-ferie-direction-plus-tard-${ferie.date}`, "1");
    } catch {}
    setFerie(null);
  }

  const [y, m, d] = ferie.date.split("-").map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-card border border-black/5 p-6 max-w-md w-full">
        <h2 className="font-bold text-brand-dark text-lg mb-2">Jour férié à venir</h2>
        <p className="text-sm text-brand-dark/70 mb-1">
          Le <span className="font-semibold text-brand-dark">{dateLabel}</span> est un jour férié ({ferie.libelle}).
        </p>
        <p className="text-sm text-brand-dark/70 mb-5">
          Souhaitez-vous que vos collaborateurs puissent travailler ce jour-là ? Si oui, ils seront prévenus et pourront indiquer s'ils souhaitent travailler. Si non, rien ne se passe.
        </p>
        <JourFerieOuvertureActions date={ferie.date} onDecision={() => setFerie(null)} />
        <div className="mt-4 flex items-center justify-between text-xs">
          <button type="button" onClick={plusTard} className="text-brand-dark/50 hover:underline">
            Plus tard
          </button>
          <Link href="/jours-feries" className="font-semibold text-brand-greendark hover:underline">
            Voir tous les jours fériés →
          </Link>
        </div>
      </div>
    </div>
  );
}
