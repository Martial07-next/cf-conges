"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JourFeriePopup() {
  const router = useRouter();
  const [ferie, setFerie] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/jours-feries")
      .then((res) => res.json())
      .then((data) => setFerie(data));
  }, []);

  async function repondre(souhaiteTravailler) {
    if (!ferie) return;
    setLoading(true);
    await fetch("/api/jours-feries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: ferie.date, souhaiteTravailler }),
    });
    setLoading(false);
    setFerie(null);
    router.refresh();
  }

  if (!ferie) return null;

  const dateLabel = new Date(ferie.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-card border border-black/5 p-6 max-w-sm w-full">
        <h2 className="font-bold text-brand-dark text-lg mb-2">Jour férié à venir</h2>
        <p className="text-sm text-brand-dark/70 mb-1">
          Le <span className="font-semibold text-brand-dark">{dateLabel}</span> est un jour férié ({ferie.libelle}).
        </p>
        <p className="text-sm text-brand-dark/70 mb-5">
          Souhaitez-vous travailler ce jour-là ? Conformément à la convention collective IDCC 1516, votre demande sera soumise à l'acceptation de votre employeur.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => repondre(false)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 hover:bg-black/5 text-sm font-semibold text-brand-dark disabled:opacity-50"
          >
            Non, férié chômé
          </button>
          <button
            onClick={() => repondre(true)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-greendark text-sm font-semibold text-brand-dark disabled:opacity-50"
          >
            Oui, je travaille
          </button>
        </div>
      </div>
    </div>
  );
}
