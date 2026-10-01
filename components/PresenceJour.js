"use client";

import { useState } from "react";

function libellePeriode(req, periode, teletravail) {
  if (req) {
    if (!req.demiJournee || req.demiJourneePeriode === periode) {
      return {
        label: req.leaveType?.code === "TT" ? "Télétravail" : req.leaveType?.libelle || "Absence",
        type: req.leaveType?.code === "TT" ? "teletravail" : "absence",
        couleur: req.leaveType?.couleur,
      };
    }
  }
  if (teletravail) return { label: "Télétravail", type: "teletravail" };
  return { label: "Au bureau", type: "present" };
}

function libelleCompact(etat) {
  if (etat.type === "present") return "B";
  if (etat.type === "teletravail") return "TT";
  return etat.label;
}

function Etat({ etat, compact = false }) {
  const classes =
    etat.type === "present"
      ? "bg-brand-green/15 text-brand-greendark"
      : etat.type === "teletravail"
        ? "bg-black/5 text-brand-dark"
        : "bg-brand-yellow/20 text-brand-dark";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-semibold ${classes} ${compact ? "px-1 py-0.5 text-[9px]" : "px-2.5 py-1.5 text-xs"}`}
      style={etat.couleur && etat.type === "absence" ? { backgroundColor: `${etat.couleur}33` } : undefined}
    >
      {compact ? libelleCompact(etat) : etat.label}
    </span>
  );
}

export default function PresenceJour({ userName, dateLabel, request = null, teletravail = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const matin = libellePeriode(request, "MATIN", teletravail);
  const apresMidi = libellePeriode(request, "APREM", teletravail);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-xl text-left transition hover:bg-black/[0.03] focus-ring ${compact ? "p-0.5" : "p-2"}`}
        aria-label={`Voir la présence de ${userName} le ${dateLabel}`}
      >
        <div className="grid grid-cols-2 gap-1">
          <div className="min-w-0">
            {!compact && <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark/40">Matin</div>}
            <Etat etat={matin} compact={compact} />
          </div>
          <div className="min-w-0">
            {!compact && <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark/40">Après-midi</div>}
            <Etat etat={apresMidi} compact={compact} />
          </div>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-brand-night dark:border dark:border-white/10 p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-brand-dark">{userName}</h3>
                <p className="mt-0.5 text-sm text-brand-dark/50">{dateLabel}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-dark/50 hover:bg-black/5">Fermer</button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/5 p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-dark/40">Matin</div>
                <Etat etat={matin} />
              </div>
              <div className="rounded-2xl border border-black/5 p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-dark/40">Après-midi</div>
                <Etat etat={apresMidi} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
