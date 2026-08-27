"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

// canEdit=true : affiche un bouton "Supprimer" (gestionnaire TR / admin).
// canEdit=false : lecture seule (utilisé sur la vue personnelle du collaborateur).
export default function RegularisationBadge({ userId, dateISO, dateLabel, commentaire, createdByLabel, canEdit = false }) {
  const router = useRouter();
  const boutonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(null);

  function ouvrir() {
    const rect = boutonRef.current.getBoundingClientRect();
    const largeurPopover = 224; // w-56
    let left = rect.left + rect.width / 2 - largeurPopover / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - largeurPopover - 8));
    let top = rect.bottom + 6;
    // Si pas assez de place en dessous, on affiche au-dessus du bouton.
    if (top + 140 > window.innerHeight) {
      top = rect.top - 6;
      setPosition({ left, top, ouvrirVersLeHaut: true });
    } else {
      setPosition({ left, top, ouvrirVersLeHaut: false });
    }
    setOpen(true);
  }

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
    <>
      <button
        ref={boutonRef}
        onClick={ouvrir}
        title="Régularisation — cliquer pour voir la raison"
        className="inline-flex w-full h-5 rounded items-center justify-center text-[9px] font-bold text-white bg-alert-soft"
      >
        Rég.
      </button>

      {open &&
        position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[101] w-56 bg-white border border-black/10 rounded-lg shadow-lg p-3 text-left"
              style={{
                left: position.left,
                top: position.ouvrirVersLeHaut ? undefined : position.top,
                bottom: position.ouvrirVersLeHaut ? window.innerHeight - position.top : undefined,
              }}
            >
              <p className="text-[11px] font-semibold text-brand-dark mb-1">Régularisation du {dateLabel}</p>
              <p className="text-xs text-brand-dark/70 whitespace-pre-wrap">{commentaire || "Aucun commentaire renseigné."}</p>
              {createdByLabel && <p className="text-[10px] text-brand-dark/40 mt-1.5">par {createdByLabel}</p>}
              <div className="flex items-center justify-between mt-2.5">
                {canEdit ? (
                  <button
                    onClick={supprimer}
                    disabled={loading}
                    className="text-[11px] font-semibold text-alert-soft hover:underline disabled:opacity-50"
                  >
                    {loading ? "Suppression…" : "Supprimer"}
                  </button>
                ) : (
                  <span />
                )}
                <button onClick={() => setOpen(false)} className="text-[11px] text-brand-dark/40 hover:underline">
                  Fermer
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
