"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Pop-up pour les comptes sans date de naissance : affichée à chaque
// ouverture tant que la date n'est pas renseignée ("Plus tard" la masque
// jusqu'à la prochaine ouverture du site).
export default function DateNaissancePopup() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    try {
      if (!sessionStorage.getItem("cf-date-naissance-plus-tard")) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function plusTard() {
    try {
      sessionStorage.setItem("cf-date-naissance-plus-tard", "1");
    } catch {}
    setVisible(false);
  }

  async function enregistrer(e) {
    e.preventDefault();
    if (!date) return;
    setLoading(true);
    setErreur("");
    const res = await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateNaissance: date }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error || "Impossible d'enregistrer la date.");
      return;
    }
    setVisible(false);
    router.refresh();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={enregistrer} className="bg-white rounded-2xl shadow-card border border-black/5 p-6 max-w-sm w-full">
        <div className="text-4xl mb-2">🎂</div>
        <h2 className="font-bold text-brand-dark text-lg mb-2">Quelle est ta date d'anniversaire ?</h2>
        <p className="text-sm text-brand-dark/70 mb-4">
          Ajoute ta date de naissance pour que l'équipe puisse te souhaiter ton anniversaire.
        </p>
        <input
          type="date"
          required
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none mb-3"
        />
        {erreur && <p className="text-xs text-alert-soft mb-3">{erreur}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={plusTard}
            className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 hover:bg-black/5 text-sm font-semibold text-brand-dark"
          >
            Plus tard
          </button>
          <button
            type="submit"
            disabled={loading || !date}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-greendark text-sm font-semibold text-brand-dark disabled:opacity-50"
          >
            {loading ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
