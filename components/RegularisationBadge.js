"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// canEdit=true : affiche un bouton "Supprimer" (gestionnaire TR / admin).
// canEdit=false : lecture seule (utilisé sur la vue personnelle du collaborateur).
export default function RegularisationBadge({ userId, dateISO, dateLabel, commentaire, createdByLabel, canEdit = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function supprimer() {
    if (!confirm(`Supprimer cette régularisation du ${dateLabel} ? Le ticket sera automatiquement recrédité.`)) return;
    setLoading(true);
    const res = await fetch("/api/tr", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date: dateISO }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erreur.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <span className="relative inline-block w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Régularisation — cliquer pour voir la raison"
        className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-white bg-alert-soft"
      >
        Rég.
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-black/10 rounded-lg shadow-lg p-3 text-left">
            <p className="text-[11px] font-semibold text-brand-dark mb-1">Régularisation du {dateLabel}</p>
            <p className="text-xs text-brand-dark/70 whitespace-pre-wrap">{commentaire || "Aucun commentaire renseigné."}</p>
            {createdByLabel && <p className="text-[10px] text-brand-dark/40 mt-1.5">par {createdByLabel}</p>}
            {canEdit && (
              <button
                onClick={supprimer}
                disabled={loading}
                className="mt-2.5 text-[11px] font-semibold text-alert-soft hover:underline disabled:opacity-50"
              >
                {loading ? "Suppression…" : "Supprimer cette régularisation"}
              </button>
            )}
          </div>
        </>
      )}
    </span>
  );
}
