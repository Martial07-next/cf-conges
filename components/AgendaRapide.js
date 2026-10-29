"use client";

import { useEffect, useRef, useState } from "react";
import { PERIODES, STATUTS_AGENDA } from "@/lib/agendaDirection";

const GOMME = "__gomme__";

function cleCase(colonne, periode) {
  return `${colonne}_${periode}`;
}

// Éditeur rapide de l'agenda : on choisit un statut dans la palette, puis on
// "peint" les demi-journées (clic ou glisser). Un clic sur un jour remplit la
// journée, sur "Matin" / "Après-midi" toute la ligne. Enregistrement auto.
//
// mode "semaine" : colonnes = dates "AAAA-MM-JJ", la semaine type s'affiche
//   en fond et la gomme y revient.
// mode "modele"  : colonnes = jours 1..5 (semaine type).
export default function AgendaRapide({ mode, colonnes, initial, modele = {}, lieuxConnus = [] }) {
  const [cases, setCases] = useState(initial);
  const [pinceau, setPinceau] = useState("BUREAU");
  const [lieu, setLieu] = useState(lieuxConnus[0] || "");
  const [note, setNote] = useState("");
  const [etat, setEtat] = useState("");
  const enCours = useRef(false);
  const aEnvoyer = useRef(new Map());
  const minuteur = useRef(null);

  useEffect(() => {
    const fin = () => (enCours.current = false);
    window.addEventListener("pointerup", fin);
    return () => window.removeEventListener("pointerup", fin);
  }, []);

  function planifierEnvoi() {
    clearTimeout(minuteur.current);
    setEtat("…");
    minuteur.current = setTimeout(envoyer, 600);
  }

  async function envoyer() {
    const lot = [...aEnvoyer.current.values()];
    aEnvoyer.current.clear();
    if (lot.length === 0) return;
    const res = await fetch(mode === "modele" ? "/api/agenda-direction/modele" : "/api/agenda-direction", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entrees: lot }),
    }).catch(() => null);
    setEtat(res?.ok ? "Enregistré ✓" : "Erreur d'enregistrement, réessayez");
  }

  function peindre(listeCases) {
    const statut = pinceau === GOMME ? null : pinceau;
    const valeur = statut
      ? { statut, lieu: STATUTS_AGENDA[statut].avecLieu ? lieu.trim() || null : null, note: note.trim() || null }
      : null;
    setCases((actuelles) => {
      const copie = { ...actuelles };
      for (const [colonne, periode] of listeCases) {
        const cle = cleCase(colonne.id, periode);
        if (valeur) copie[cle] = valeur;
        else delete copie[cle];
        aEnvoyer.current.set(cle, {
          ...(mode === "modele" ? { jour: colonne.id } : { date: colonne.id }),
          periode,
          statut: valeur?.statut || null,
          lieu: valeur?.lieu || null,
          note: valeur?.note || null,
        });
      }
      return copie;
    });
    planifierEnvoi();
  }

  const toutesLesCases = colonnes.flatMap((c) => PERIODES.map((p) => [c, p.valeur]));
  const statutPinceau = STATUTS_AGENDA[pinceau];

  return (
    <div>
      {/* Palette */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {Object.entries(STATUTS_AGENDA).map(([v, s]) => (
          <button
            key={v}
            type="button"
            onClick={() => setPinceau(v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              pinceau === v ? "border-transparent text-white shadow" : "border-black/10 text-brand-dark hover:bg-black/5"
            }`}
            style={pinceau === v ? { backgroundColor: s.couleur } : undefined}
          >
            {pinceau !== v && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.couleur }} />}
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPinceau(GOMME)}
          title={mode === "modele" ? "Vider la demi-journée" : "Revenir à la semaine type"}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${pinceau === GOMME ? "border-brand-dark bg-brand-dark text-brand-cream" : "border-black/10 text-brand-dark hover:bg-black/5"}`}
        >
          ⌫ Effacer
        </button>
      </div>

      {statutPinceau && (
        <div className="mb-4 flex flex-wrap gap-2">
          {statutPinceau.avecLieu && (
            <>
              <datalist id={`lieux-${mode}`}>
                {lieuxConnus.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
              <input
                list={`lieux-${mode}`}
                value={lieu}
                onChange={(e) => setLieu(e.target.value)}
                placeholder={pinceau === "DEPLACEMENT" ? "Lieu (ville, client…)" : "Bâtiment / salle (facultatif)"}
                maxLength={80}
                className="w-56 rounded-lg border border-black/10 bg-brand-cream/60 px-2.5 py-1.5 text-xs focus-ring outline-none"
              />
            </>
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Précision (facultatif)"
            maxLength={200}
            className="w-56 rounded-lg border border-black/10 bg-brand-cream/60 px-2.5 py-1.5 text-xs focus-ring outline-none"
          />
        </div>
      )}

      {/* Grille */}
      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white select-none">
        <table className="w-full table-fixed border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-16 px-1 py-2 md:w-24 md:px-2">
                <button type="button" onClick={() => peindre(toutesLesCases)} className="rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight text-brand-greendark hover:bg-black/5 md:px-2 md:text-[11px]" title="Appliquer à toute la semaine">
                  Toute la semaine
                </button>
              </th>
              {colonnes.map((c) => (
                <th key={c.id} className="px-0.5 py-2 md:px-1">
                  <button
                    type="button"
                    onClick={() => peindre(PERIODES.map((p) => [c, p.valeur]))}
                    className={`w-full rounded-lg px-1 py-1 font-semibold hover:bg-black/5 ${c.aujourdhui ? "text-brand-greendark" : "text-brand-dark/70"}`}
                    title={c.titre ? `Appliquer à tous les ${c.titre}` : "Appliquer à toute la journée"}
                  >
                    {c.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODES.map((p) => (
              <tr key={p.valeur}>
                <th className="px-1 py-1 md:px-2">
                  <button
                    type="button"
                    onClick={() => peindre(colonnes.map((c) => [c, p.valeur]))}
                    className="w-full rounded-lg px-1 py-1 text-left text-[9px] font-semibold uppercase tracking-wide text-brand-dark/50 hover:bg-black/5 md:px-2 md:text-[11px]"
                    title={`Appliquer à tous les ${p.label.toLowerCase()}s`}
                  >
                    {p.label}
                  </button>
                </th>
                {colonnes.map((c) => {
                  const cle = cleCase(c.id, p.valeur);
                  const propre = cases[cle];
                  const deModele = !propre && mode === "semaine" ? modele[`${c.jour}_${p.valeur}`] : null;
                  const creneau = propre || deModele;
                  const statut = creneau && STATUTS_AGENDA[creneau.statut];
                  return (
                    <td key={c.id} className="p-0.5 md:p-1">
                      <div
                        role="button"
                        tabIndex={0}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          enCours.current = true;
                          peindre([[c, p.valeur]]);
                        }}
                        onPointerEnter={() => enCours.current && peindre([[c, p.valeur]])}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && peindre([[c, p.valeur]])}
                        style={{ touchAction: "none", ...(statut ? { backgroundColor: deModele ? `${statut.couleur}33` : statut.couleur } : {}) }}
                        className={`flex h-14 cursor-pointer flex-col items-center justify-center rounded-xl px-1 text-center transition ${
                          statut ? (deModele ? "border border-dashed text-brand-dark" : "text-white") : "border border-dashed border-black/15 text-brand-dark/30 hover:bg-black/5"
                        }`}
                        title={creneau?.note || undefined}
                      >
                        <span className="text-[10px] font-bold leading-tight md:text-[11px]">{statut ? statut.label : "—"}</span>
                        {creneau?.lieu && <span className="max-w-full truncate text-[9px] opacity-80 md:text-[10px]">{creneau.lieu}</span>}
                        {deModele && <span className="hidden text-[9px] opacity-60 md:inline">semaine type</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 h-4 text-xs font-semibold text-brand-greendark">{etat}</p>
    </div>
  );
}
