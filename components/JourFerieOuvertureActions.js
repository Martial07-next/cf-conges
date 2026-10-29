"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Boutons de décision de la direction pour un jour férié.
export default function JourFerieOuvertureActions({ date, ouvert = null, onDecision }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function decider(valeur) {
    if (valeur && !confirm("Autoriser le travail ce jour férié ? Les collaborateurs seront prévenus et pourront indiquer s'ils souhaitent travailler.")) return;
    setLoading(true);
    const res = await fetch("/api/jours-feries/ouverture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ouvert: valeur }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Erreur.");
      return;
    }
    onDecision?.(valeur);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={loading || ouvert === false}
        onClick={() => decider(false)}
        className="px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Non, férié chômé
      </button>
      <button
        type="button"
        disabled={loading || ouvert === true}
        onClick={() => decider(true)}
        className="px-3 py-2 rounded-xl bg-brand-green hover:bg-brand-greendark text-xs font-semibold text-[#16231A] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Oui, autoriser le travail
      </button>
    </div>
  );
}
