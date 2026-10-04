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

function couleursEtat(etat) {
  if (etat.type === "present") return "bg-brand-green/20 text-brand-greendark";
  if (etat.type === "teletravail") return "bg-black/[0.06] text-brand-dark dark:bg-white/10";
  return "bg-brand-yellow/25 text-brand-dark";
}

function styleEtat(etat) {
  return etat.couleur && etat.type === "absence"
    ? { backgroundColor: `${etat.couleur}33` }
    : undefined;
}

function EtatDetail({ etat }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${couleursEtat(etat)}`}
        style={styleEtat(etat)}
      >
        {etat.type === "present" ? "B" : etat.type === "teletravail" ? "TT" : "A"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-brand-dark">{etat.label}</p>
        <p className="text-[11px] text-brand-dark/45">
          {etat.type === "present" ? "Présence sur site" : etat.type === "teletravail" ? "À distance" : "Absence"}
        </p>
      </div>
    </div>
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
        className={`group w-full text-left focus-ring ${compact ? "rounded-lg" : "rounded-2xl"}`}
        aria-label={`Voir la présence de ${userName} le ${dateLabel}`}
      >
        {compact ? (
          <div className="grid h-6 w-full grid-cols-2 overflow-hidden rounded-lg border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition group-hover:border-black/15 dark:border-white/10 dark:bg-brand-night">
            <span
              className={`flex min-w-0 items-center justify-center border-r border-black/10 px-0.5 text-[9px] font-extrabold leading-none dark:border-white/10 ${couleursEtat(matin)}`}
              style={styleEtat(matin)}
              title={`Matin : ${matin.label}`}
            >
              <span className="truncate">{libelleCompact(matin)}</span>
            </span>
            <span
              className={`flex min-w-0 items-center justify-center px-0.5 text-[9px] font-extrabold leading-none ${couleursEtat(apresMidi)}`}
              style={styleEtat(apresMidi)}
              title={`Après-midi : ${apresMidi.label}`}
            >
              <span className="truncate">{libelleCompact(apresMidi)}</span>
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm transition group-hover:border-black/15 dark:border-white/10 dark:bg-brand-night">
            <div className="min-w-0 border-r border-black/[0.06] p-3 dark:border-white/10">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-dark/40">Matin</div>
              <EtatDetail etat={matin} />
            </div>
            <div className="min-w-0 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-dark/40">Après-midi</div>
              <EtatDetail etat={apresMidi} />
            </div>
          </div>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-brand-night" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-5 dark:border-white/10 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-dark/35">Détail de la journée</p>
                <h3 className="mt-1 text-lg font-bold text-brand-dark">{userName}</h3>
                <p className="mt-0.5 text-sm text-brand-dark/50">{dateLabel}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-lg text-brand-dark/60 transition hover:bg-black/[0.08] dark:bg-white/10" aria-label="Fermer">×</button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <div className="rounded-2xl border border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-yellow/25 text-[10px] font-extrabold text-brand-dark">AM</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-dark/45">Matin</span>
                </div>
                <EtatDetail etat={matin} />
              </div>
              <div className="rounded-2xl border border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-green/15 text-[10px] font-extrabold text-brand-greendark">PM</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-dark/45">Après-midi</span>
                </div>
                <EtatDetail etat={apresMidi} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
