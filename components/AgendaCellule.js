"use client";

import { useState } from "react";
import { PERIODES, PRESENT, statutAgenda, libelleCreneau } from "@/lib/agendaDirection";

// Case du planning pour un Employeur / RH ou la Direction qui a saisi une
// exception ce jour-là, détail au clic. Journée entière identique = un seul
// bloc ; sinon matin et après-midi côte à côte (sans exception = présent).
export default function AgendaCellule({ userName, dateLabel, creneaux, variante = "semaine" }) {
  const [ouvert, setOuvert] = useState(false);

  const [matin, aprem] = PERIODES.map((p) => creneaux?.[p.valeur] || null);
  const journeeEntiere =
    !!matin && !!aprem && matin.statut === aprem.statut && (matin.lieu || null) === (aprem.lieu || null) && (matin.note || null) === (aprem.note || null);
  const moities = journeeEntiere
    ? [{ valeur: "JOURNEE", label: "Journée entière", creneau: matin, statut: statutAgenda(matin.statut) || PRESENT }]
    : PERIODES.map((p) => ({ ...p, creneau: creneaux?.[p.valeur] || null, statut: statutAgenda(creneaux?.[p.valeur]?.statut) || PRESENT }));
  const titre = journeeEntiere ? libelleCreneau(matin) : moities.map((m) => `${m.label} : ${libelleCreneau(m.creneau)}`).join(" · ");

  const hauteur = variante === "mois" ? "h-5" : "h-6";
  const taille = variante === "mois" ? "text-[8px]" : "text-[10px]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        title={titre}
        className={`flex w-full ${variante === "jour" ? "max-w-sm gap-1.5" : `${hauteur} gap-px`} overflow-hidden rounded-lg text-left focus-ring`}
      >
        {moities.map((m) =>
          variante === "jour" ? (
            <span
              key={m.valeur}
              className="flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              style={{ backgroundColor: `${m.statut.couleur}22`, borderLeft: `3px solid ${m.statut.couleur}` }}
            >
              <span className="block text-[10px] uppercase tracking-wide text-brand-dark/45">{m.label}</span>
              <span className="block truncate text-brand-dark">{libelleCreneau(m.creneau)}</span>
            </span>
          ) : (
            <span
              key={m.valeur}
              className={`flex flex-1 items-center justify-center truncate px-1 font-bold ${taille} text-white`}
              style={{ backgroundColor: m.statut.couleur, opacity: m.statut === PRESENT ? 0.55 : 1 }}
            >
              {journeeEntiere && variante !== "mois" ? m.statut.label : m.statut.code}
            </span>
          )
        )}
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setOuvert(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-5 text-left shadow-card" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-brand-dark/50">{dateLabel}</p>
            <h3 className="mb-4 font-bold text-brand-dark">{userName}</h3>
            <div className="space-y-3">
              {moities.map((m) => (
                <div key={m.valeur} className="rounded-xl border border-black/10 p-3" style={m.statut ? { borderLeft: `4px solid ${m.statut.couleur}` } : undefined}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/50">{m.label}</span>
                    {m.statut && (
                      <span className={`text-[11px] font-semibold ${m.statut.joignable ? "text-[#16A34A]" : "text-alert-soft"}`}>
                        {m.statut.joignable ? "● Joignable" : "● Non joignable"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-brand-dark">{m.statut.label}</p>
                  {m.creneau?.lieu && <p className="text-xs text-brand-dark/60">📍 {m.creneau.lieu}</p>}
                  {m.creneau?.note && <p className="mt-1 text-xs text-brand-dark/60">{m.creneau.note}</p>}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setOuvert(false)} className="mt-4 w-full rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-black/5">
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
