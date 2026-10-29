"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESENT, STATUTS_AGENDA } from "@/lib/agendaDirection";

const EFFACER = "__present__";
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

// Agenda au pinceau : on choisit un type puis on clique (ou on glisse) sur
// les jours du calendrier. Par défaut la journée entière ; les boutons
// "Matin" / "Après-midi" coupent la journée en deux et ne peignent que
// cette moitié. "Présent" efface. Enregistrement automatique.
export default function AgendaPinceau({ semaines, initial, lieuxConnus = [] }) {
  const router = useRouter();
  const [cases, setCases] = useState(initial);
  const [pinceau, setPinceau] = useState("TELETRAVAIL");
  const [moitie, setMoitie] = useState(null); // null = journée entière
  const [lieu, setLieu] = useState("");
  const [note, setNote] = useState("");
  const [etat, setEtat] = useState("");
  const trait = useRef(null); // jours peints pendant le geste en cours

  useEffect(() => {
    const fin = () => terminerTrait();
    window.addEventListener("pointerup", fin);
    return () => window.removeEventListener("pointerup", fin);
  });

  const statut = pinceau === EFFACER ? null : pinceau;
  const s = statut ? STATUTS_AGENDA[statut] : null;

  function appliquerLocal(iso) {
    const valeur = statut ? { statut, lieu: s.avecLieu ? lieu.trim() || null : null, note: note.trim() || null } : null;
    setCases((actuelles) => {
      const jour = { ...(actuelles[iso] || {}) };
      for (const p of moitie ? [moitie] : ["MATIN", "APREM"]) {
        if (valeur) jour[p] = valeur;
        else delete jour[p];
      }
      const copie = { ...actuelles };
      if (Object.keys(jour).length) copie[iso] = jour;
      else delete copie[iso];
      return copie;
    });
  }

  function toucher(jour) {
    // Jours passés et fériés non travaillés : non modifiables.
    if (jour.verrou) return;
    const iso = jour.iso;
    if (!trait.current || trait.current.has(iso)) return;
    trait.current.add(iso);
    appliquerLocal(iso);
  }

  async function terminerTrait() {
    const jours = trait.current ? [...trait.current] : [];
    trait.current = null;
    if (jours.length === 0) return;
    setEtat("Enregistrement…");
    const res = await fetch("/api/agenda-evenements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jours, periode: moitie, statut, lieu, note }),
    }).catch(() => null);
    setEtat(res?.ok ? "Enregistré ✓" : "Erreur d'enregistrement, réessayez");
    // Vide le cache de navigation (pages préchargées par le menu) : le
    // planning, le tableau de bord et cet agenda s'affichent aussitôt à jour,
    // sans avoir à actualiser la page.
    if (res?.ok) router.refresh();
  }

  function basculerMoitie(p) {
    setMoitie((actuelle) => (actuelle === p ? null : p));
  }

  return (
    <div>
      {/* Pinceau : type */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {Object.entries(STATUTS_AGENDA).map(([v, st]) => (
          <button
            key={v}
            type="button"
            onClick={() => setPinceau(v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              pinceau === v ? "border-transparent text-white shadow" : "border-black/10 text-brand-dark hover:bg-black/5"
            }`}
            style={pinceau === v ? { backgroundColor: st.couleur } : undefined}
          >
            {pinceau !== v && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.couleur }} />}
            {st.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPinceau(EFFACER)}
          title="Remettre « Présent »"
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${pinceau === EFFACER ? "border-transparent bg-[#16A34A] text-white shadow" : "border-black/10 text-brand-dark hover:bg-black/5"}`}
        >
          ✓ Présent (effacer)
        </button>
      </div>

      {/* Demi-journée (facultatif) + lieu / précision */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          ["MATIN", "Matin"],
          ["APREM", "Après-midi"],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => basculerMoitie(v)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${moitie === v ? "border-brand-dark bg-brand-dark text-brand-cream dark:border-brand-green dark:bg-brand-green dark:text-[#16231a]" : "border-black/10 text-brand-dark hover:bg-black/5"}`}
          >
            {moitie === v ? `✓ ${l} seulement` : l}
          </button>
        ))}
        <span className="text-xs text-brand-dark/45">{moitie ? "La journée est coupée en deux." : "Journée entière"}</span>
        {s?.avecLieu && (
          <>
            <input
              list="agenda-lieux"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              placeholder={statut === "DEPLACEMENT" ? "Lieu (ville, client…)" : "Bâtiment, salle… (facultatif)"}
              maxLength={80}
              className="w-52 rounded-lg border border-black/10 bg-brand-cream/60 px-2.5 py-1.5 text-xs focus-ring outline-none"
            />
            <datalist id="agenda-lieux">
              {lieuxConnus.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </>
        )}
        {s && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Précision (facultatif)"
            maxLength={200}
            className="w-52 rounded-lg border border-black/10 bg-brand-cream/60 px-2.5 py-1.5 text-xs focus-ring outline-none"
          />
        )}
      </div>

      {/* Calendrier */}
      <div className="select-none rounded-2xl border border-black/5 bg-white p-2">
        <div className="grid grid-cols-5 gap-1.5 pb-1">
          {JOURS.map((j) => (
            <div key={j} className="text-center text-[11px] font-semibold uppercase tracking-wide text-brand-dark/45">
              {j}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {semaines.map((semaine, i) => (
            <div key={i} className="grid grid-cols-5 gap-1.5">
              {semaine.map((jour) => {
                const creneaux = cases[jour.iso] || {};
                const matin = STATUTS_AGENDA[creneaux.MATIN?.statut] || null;
                const aprem = STATUTS_AGENDA[creneaux.APREM?.statut] || null;
                const journeeEntiere = matin && aprem && creneaux.MATIN.statut === creneaux.APREM.statut && creneaux.MATIN.lieu === creneaux.APREM.lieu;
                const lieuAffiche = creneaux.MATIN?.lieu || creneaux.APREM?.lieu;
                return (
                  <div
                    key={jour.iso}
                    role="button"
                    tabIndex={jour.verrou ? -1 : 0}
                    aria-disabled={!!jour.verrou}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      trait.current = new Set();
                      toucher(jour);
                    }}
                    onPointerEnter={() => toucher(jour)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        trait.current = new Set();
                        toucher(jour);
                        terminerTrait();
                      }
                    }}
                    title={
                      jour.verrou === "passe"
                        ? "Jour passé : non modifiable"
                        : jour.verrou === "ferie"
                          ? `${jour.ferie} : jour férié non travaillé`
                          : [jour.ferieTravaille && `${jour.ferie} (travaillé)`, creneaux.MATIN?.note, creneaux.APREM?.note].filter(Boolean).join(" · ") || undefined
                    }
                    style={{ touchAction: "none" }}
                    className={`relative flex h-16 flex-col overflow-hidden rounded-xl border text-center transition ${
                      jour.verrou ? "cursor-not-allowed" : "cursor-pointer hover:ring-2 hover:ring-black/10"
                    } ${jour.aujourdhui ? "border-brand-green" : "border-black/5"} ${
                      jour.horsMois ? "opacity-35" : jour.verrou === "passe" ? "opacity-50 grayscale" : ""
                    }`}
                  >
                    <span className="absolute left-1.5 top-1 z-10 text-[10px] font-bold text-brand-dark/60">{jour.numero}</span>
                    {!matin && !aprem && jour.ferie ? (
                      <span className={`flex flex-1 items-end justify-center pb-1.5 text-[10px] font-medium ${jour.ferieTravaille ? "text-[#16A34A]/80" : "bg-black/[0.04] text-brand-dark/45"}`}>
                        {jour.ferieTravaille ? "Férié travaillé" : "Férié 🔒"}
                      </span>
                    ) : !matin && !aprem ? (
                      <span className="flex flex-1 items-end justify-center pb-1.5 text-[10px] font-medium text-[#16A34A]/70">{PRESENT.label}</span>
                    ) : journeeEntiere ? (
                      <span className="flex flex-1 flex-col items-center justify-end pb-1 text-white" style={{ backgroundColor: matin.couleur }}>
                        <span className="text-[10px] font-bold leading-tight">{matin.label}</span>
                        {lieuAffiche && <span className="max-w-full truncate px-1 text-[9px] opacity-85">{lieuAffiche}</span>}
                      </span>
                    ) : (
                      <span className="flex flex-1">
                        {[matin, aprem].map((st, k) => (
                          <span
                            key={k}
                            className={`flex flex-1 items-end justify-center pb-1 text-[9px] font-bold leading-tight ${st ? "text-white" : "text-[#16A34A]/70"}`}
                            style={st ? { backgroundColor: st.couleur } : { backgroundColor: "rgba(22,163,74,0.06)" }}
                          >
                            {st ? st.code : "B"}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-brand-dark/45">Astuce : glissez sur plusieurs jours pour les remplir d'un coup. Les jours passés et les jours fériés non travaillés ne sont pas modifiables.</span>
        <span className="h-4 font-semibold text-[#16A34A]">{etat}</span>
      </div>
    </div>
  );
}
