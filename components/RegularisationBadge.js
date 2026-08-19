"use client";

import { useState } from "react";

export default function RegularisationBadge({ dateLabel, commentaire, createdByLabel }) {
  const [open, setOpen] = useState(false);

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
          </div>
        </>
      )}
    </span>
  );
}
