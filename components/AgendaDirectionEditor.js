"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";
import { PERIODES, STATUTS_AGENDA } from "@/lib/agendaDirection";

const VIDE = { statut: "", lieu: "", note: "" };

export default function AgendaDirectionEditor({ jours, initial, semainePrecedente, lieuxConnus }) {
  const router = useRouter();
  const [creneaux, setCreneaux] = useState(initial);
  const [enregistre, setEnregistre] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState(false);

  const modifie = useMemo(() => JSON.stringify(creneaux) !== JSON.stringify(enregistre), [creneaux, enregistre]);
  const aSemainePrecedente = Object.keys(semainePrecedente).length > 0;

  function valeur(cle) {
    return creneaux[cle] || VIDE;
  }

  function changer(cle, champ, v) {
    setMessage("");
    setCreneaux((actuels) => {
      const suivant = { ...(actuels[cle] || VIDE), [champ]: v };
      if (champ === "statut" && !STATUTS_AGENDA[v]?.avecLieu) suivant.lieu = "";
      const copie = { ...actuels };
      if (!suivant.statut && !suivant.note) delete copie[cle];
      else copie[cle] = suivant;
      return copie;
    });
  }

  function journeeEntiere(iso) {
    setMessage("");
    setCreneaux((actuels) => {
      const matin = actuels[`${iso}_MATIN`];
      const copie = { ...actuels };
      if (matin) copie[`${iso}_APREM`] = { ...matin };
      else delete copie[`${iso}_APREM`];
      return copie;
    });
  }

  function copierSemainePrecedente() {
    setMessage("");
    setCreneaux({ ...semainePrecedente });
  }

  function toutEffacer() {
    if (!confirm("Effacer tout l'agenda de cette semaine ?")) return;
    setMessage("");
    setCreneaux({});
  }

  async function enregistrer() {
    setLoading(true);
    setMessage("");
    const entrees = jours.flatMap((j) =>
      PERIODES.map((p) => {
        const c = creneaux[`${j.iso}_${p.valeur}`];
        return { date: j.iso, periode: p.valeur, statut: c?.statut || null, lieu: c?.lieu || null, note: c?.note || null };
      })
    );
    const res = await fetch("/api/agenda-direction", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entrees }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErreur(true);
      setMessage(data.error || "Erreur lors de l'enregistrement.");
      return;
    }
    setErreur(false);
    setEnregistre(creneaux);
    setMessage("Agenda enregistré ✓");
    router.refresh();
  }

  return (
    <div>
      <datalist id="agenda-lieux">
        {lieuxConnus.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copierSemainePrecedente}
          disabled={!aSemainePrecedente}
          title={aSemainePrecedente ? "Reprendre l'agenda de la semaine précédente" : "La semaine précédente est vide"}
          className="px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Copier la semaine précédente
        </button>
        <button type="button" onClick={toutEffacer} className="px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-brand-dark">
          Tout effacer
        </button>
      </div>

      <div className="space-y-3">
        {jours.map((j) => (
          <Card key={j.iso} className={`p-4 ${j.estAujourdhui ? "ring-2 ring-brand-green/40" : ""}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-brand-dark">
                {j.label}
                {j.estAujourdhui && <span className="ml-2 text-xs font-semibold text-brand-greendark">Aujourd'hui</span>}
              </h3>
              <button
                type="button"
                onClick={() => journeeEntiere(j.iso)}
                className="text-xs font-semibold text-brand-greendark hover:underline"
                title="Recopier le matin sur l'après-midi"
              >
                Même chose l'après-midi
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {PERIODES.map((p) => {
                const cle = `${j.iso}_${p.valeur}`;
                const c = valeur(cle);
                const statut = STATUTS_AGENDA[c.statut];
                return (
                  <div key={p.valeur} className="rounded-xl border border-black/10 p-3" style={statut ? { borderLeft: `4px solid ${statut.couleur}` } : undefined}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/50">{p.label}</span>
                      {statut && (
                        <span className={`text-[10px] font-semibold ${statut.joignable ? "text-[#16A34A]" : "text-alert-soft"}`}>
                          {statut.joignable ? "● Joignable" : "● Non joignable"}
                        </span>
                      )}
                    </div>
                    <select
                      value={c.statut}
                      onChange={(e) => changer(cle, "statut", e.target.value)}
                      className="w-full rounded-lg border border-black/10 bg-brand-cream/60 px-2.5 py-2 text-sm focus-ring outline-none"
                    >
                      <option value="">Non renseigné</option>
                      {Object.entries(STATUTS_AGENDA).map(([v, s]) => (
                        <option key={v} value={v}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    {statut?.avecLieu && (
                      <input
                        list="agenda-lieux"
                        value={c.lieu}
                        onChange={(e) => changer(cle, "lieu", e.target.value)}
                        placeholder={c.statut === "DEPLACEMENT" ? "Lieu (ville, client, site…)" : "Bâtiment / salle"}
                        maxLength={80}
                        className="mt-2 w-full rounded-lg border border-black/10 bg-brand-cream/60 px-2.5 py-2 text-sm focus-ring outline-none"
                      />
                    )}
                    {statut && (
                      <input
                        value={c.note}
                        onChange={(e) => changer(cle, "note", e.target.value)}
                        placeholder="Précision (facultatif), ex. joignable par téléphone"
                        maxLength={200}
                        className="mt-2 w-full rounded-lg border border-black/10 bg-brand-cream/60 px-2.5 py-2 text-xs focus-ring outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Barre d'enregistrement à gauche : le coin bas droit est occupé par OSEFBOT. */}
      <div className="sticky bottom-4 mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" className="shadow-lg" disabled={loading || !modifie} onClick={enregistrer}>
          {loading ? "Enregistrement…" : "Enregistrer la semaine"}
        </Button>
        {message && <span className={`text-sm font-semibold ${erreur ? "text-alert-soft" : "text-brand-greendark"}`}>{message}</span>}
        {modifie && !message && <span className="text-xs text-brand-dark/50">Modifications non enregistrées</span>}
      </div>
    </div>
  );
}
