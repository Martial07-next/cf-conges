"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icone from "@/components/Icone";
import { apparenceEtat, memeEtat, HORAIRES } from "@/lib/etatJournee";

// Une seule fenêtre de détail pour tout le planning : les cases sont rendues
// côté serveur (rien à hydrater) et portent dans data-journee les numéros
// "personne.date.matin.après-midi" du registre { personnes, dates, etats }.
export function HoteDetailJournee({ registre, children }) {
  const [detail, setDetail] = useState(null);
  const fermer = useCallback(() => setDetail(null), []);

  function surClic(e) {
    const cible = e.target.closest?.("[data-journee]");
    if (!cible) return;
    const [p, d, m, a] = cible.getAttribute("data-journee").split(".").map(Number);
    const personne = registre.personnes[p];
    if (!personne) return;
    setDetail({ p: personne, d: registre.dates[d], m: registre.etats[m], a: registre.etats[a] });
  }

  return (
    <div onClick={surClic}>
      {children}
      {detail && <DetailJournee personne={detail.p} dateLabel={detail.d} matin={detail.m} aprem={detail.a} onClose={fermer} />}
    </div>
  );
}

// "09:00" -> "9h", "13:30" -> "13h30".
const heure = (h) => (h ? h.replace(/^0(\d)/, "$1").replace(":", "h").replace(/h00$/, "h") : "");

// Barre de couleur d'un créneau ; hachurée vert / noir pour une formation,
// pour la distinguer du vert « Au bureau ».
function fondBarre(etat) {
  return etat.type === "formation"
    ? { backgroundImage: "repeating-linear-gradient(135deg, #0afe6b 0 6px, #0E1712 6px 10px)" }
    : { backgroundColor: etat.couleur };
}

// Formations animées (même carte que l'« Équipe en direct ») : intitulé en
// entier, horaires, salle et lien vers la fiche session du planning.
function CartesFormations({ formations }) {
  return (
    <div className="mt-3 space-y-2">
      {formations.map((f, i) => (
        <div key={`${f.formation}-${i}`} className="rounded-xl bg-[#0E1712] px-3.5 py-3 text-[#EBF0E8] ring-1 ring-[#0afe6b]/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0afe6b]">En formation</p>
          {f.lien ? (
            <a href={f.lien} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-sm font-bold leading-snug text-white hover:underline">
              {f.formation} <span aria-hidden className="text-[#0afe6b]">↗</span>
            </a>
          ) : (
            <p className="mt-0.5 text-sm font-bold leading-snug text-white">{f.formation}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#EBF0E8]/60">
            {f.debut && f.fin && (
              <span className="inline-flex items-center gap-1">
                <Icone name="clock" className="h-3.5 w-3.5" />
                {heure(f.debut)} – {heure(f.fin)}
              </span>
            )}
            {f.salle && (
              <span className="inline-flex items-center gap-1">
                <Icone name="pin" className="h-3.5 w-3.5" />
                {f.salle}
              </span>
            )}
          </p>
          {f.lien && (
            <a
              href={f.lien}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#0afe6b] px-3 py-1.5 text-xs font-bold text-[#0E1712] transition hover:bg-[#3dff8c]"
            >
              Voir la session de formation ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function BlocCreneau({ titre, horaires, etat }) {
  const { className, style } = apparenceEtat(etat);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.015] p-4 pl-5 dark:border-white/10 dark:bg-white/[0.03]">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={fondBarre(etat)} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">{titre}</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-dark/45">
          <Icone name="clock" className="h-3.5 w-3.5" />
          {horaires}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${className}`} style={style}>
          {etat.code}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-brand-dark">{etat.label}</p>
          <p className="truncate text-xs text-brand-dark/50">{etat.type === "formation" ? "Planning CF Formations" : etat.detail}</p>
        </div>
      </div>
      {etat.formations?.length > 0 && <CartesFormations formations={etat.formations} />}
      {((etat.lieu && etat.type !== "formation") || etat.note || etat.joignable !== undefined) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {etat.joignable !== undefined && etat.type !== "ferie" && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                etat.joignable ? "bg-brand-green/15 text-[#15803D] dark:text-brand-green" : "bg-red-500/10 text-red-600 dark:text-red-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${etat.joignable ? "bg-[#16A34A]" : "bg-red-500"}`} />
              {etat.joignable ? "Joignable" : "Non joignable"}
            </span>
          )}
          {etat.lieu && etat.type !== "formation" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium text-brand-dark/70">
              <Icone name="pin" className="h-3.5 w-3.5" />
              {etat.lieu}
            </span>
          )}
        </div>
      )}
      {etat.note && <p className="mt-2 rounded-xl bg-black/[0.03] px-3 py-2 text-xs italic text-brand-dark/65">« {etat.note} »</p>}
    </div>
  );
}

// Détail de la journée : en-tête sombre, frise horaire, matin / après-midi.
export function DetailJournee({ personne, dateLabel, matin, aprem, onClose }) {
  const entiere = memeEtat(matin, aprem);

  useEffect(() => {
    function echap(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Détail de la journée de ${personne.nom}`}
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-brand-night sm:rounded-3xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-[#0E1712] px-5 pb-5 pt-5 text-[#EBF0E8]">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#0afe6b]/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#0E1712]"
                style={{ backgroundColor: personne.couleurPole || "#0afe6b" }}
              >
                {personne.initiales}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0afe6b]">Détail de la journée</p>
                <h3 className="truncate text-lg font-bold leading-tight">{personne.nom}</h3>
                <p className="truncate text-xs text-[#EBF0E8]/55">
                  {dateLabel}
                  {personne.pole ? ` · ${personne.pole}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#EBF0E8]/80 transition hover:bg-white/15"
            >
              <Icone name="close" className="h-4 w-4" />
            </button>
          </div>

          {/* Frise de la journée : 4 h le matin, pause, 3 h l'après-midi */}
          <div className="relative mt-5">
            <div className="flex h-2.5 gap-1.5">
              <span className="flex-[4] rounded-full" style={fondBarre(matin)} />
              <span className="flex-[1] rounded-full bg-white/10" title="Pause déjeuner" />
              <span className="flex-[3] rounded-full" style={fondBarre(aprem)} />
            </div>
            <div className="mt-1.5 flex text-[10px] font-medium text-[#EBF0E8]/45">
              <span className="flex-[4]">8h</span>
              <span className="flex-[1] text-center">12h – 13h</span>
              <span className="flex-[3] text-right">16h</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 p-4 sm:p-5">
          {entiere ? (
            <BlocCreneau titre="Journée entière" horaires={HORAIRES.JOURNEE} etat={matin} />
          ) : (
            <>
              <BlocCreneau titre="Matin" horaires={HORAIRES.MATIN} etat={matin} />
              <BlocCreneau titre="Après-midi" horaires={HORAIRES.APREM} etat={aprem} />
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-black/5"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
