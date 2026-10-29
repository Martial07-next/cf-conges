"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState } from "./ui";
import { STATUTS_AGENDA } from "@/lib/agendaDirection";

function formatJour(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function libellePeriode(e) {
  if (e.debutISO === e.finISO) {
    return `${formatJour(e.debutISO)}${e.demiJournee ? (e.periode === "MATIN" ? " · matin" : " · après-midi") : ""}`;
  }
  return `du ${formatJour(e.debutISO)} au ${formatJour(e.finISO)}`;
}

// Agenda Direction : on n'ajoute que les exceptions, comme une demande de
// congé. Sans exception, la personne est présente.
export default function AgendaEvenements({ aujourdHui, evenements, lieuxConnus }) {
  const router = useRouter();
  const [statut, setStatut] = useState("TELETRAVAIL");
  const [dateDebut, setDateDebut] = useState(aujourdHui);
  const [dateFin, setDateFin] = useState(aujourdHui);
  const [demiJournee, setDemiJournee] = useState(false);
  const [periode, setPeriode] = useState("MATIN");
  const [lieu, setLieu] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState(false);

  const unSeulJour = dateDebut === dateFin;
  const s = STATUTS_AGENDA[statut];

  function changerDebut(v) {
    setDateDebut(v);
    if (!dateFin || dateFin < v) setDateFin(v);
  }

  async function ajouter(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/agenda-evenements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut, dateDebut, dateFin, demiJournee: unSeulJour && demiJournee, periode, lieu, note }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErreur(true);
      setMessage(data.error || "Erreur.");
      return;
    }
    setErreur(false);
    setMessage("Ajouté ✓");
    // Formulaire remis à zéro (sinon "demi-journée" restait cochée pour l'ajout suivant).
    setDemiJournee(false);
    setPeriode("MATIN");
    setLieu("");
    setNote("");
    router.refresh();
  }

  async function supprimer(id) {
    await fetch("/api/agenda-evenements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="p-5">
        <h2 className="mb-4 font-bold text-brand-dark">Ajouter une absence ou un changement</h2>
        <form onSubmit={ajouter} className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-brand-dark/60">Type</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUTS_AGENDA).map(([v, st]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatut(v)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    statut === v ? "border-transparent text-white shadow" : "border-black/10 text-brand-dark hover:bg-black/5"
                  }`}
                  style={statut === v ? { backgroundColor: st.couleur } : undefined}
                >
                  {statut !== v && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.couleur }} />}
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-brand-dark/60">Du</span>
              <input type="date" required value={dateDebut} onChange={(e) => changerDebut(e.target.value)} className="w-full rounded-lg border border-black/10 bg-brand-cream/60 px-3 py-2 text-sm focus-ring outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-brand-dark/60">Au</span>
              <input type="date" required min={dateDebut} value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full rounded-lg border border-black/10 bg-brand-cream/60 px-3 py-2 text-sm focus-ring outline-none" />
            </label>
          </div>

          {unSeulJour && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-brand-dark">
                <input type="checkbox" checked={demiJournee} onChange={(e) => setDemiJournee(e.target.checked)} className="h-4 w-4 accent-brand-green" />
                Demi-journée seulement
              </label>
              {demiJournee && (
                <div className="inline-flex gap-1 rounded-xl bg-black/5 p-1">
                  {[["MATIN", "Matin"], ["APREM", "Après-midi"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setPeriode(v)} className={`rounded-lg px-3 py-1 text-xs font-semibold ${periode === v ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {s?.avecLieu && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-brand-dark/60">Lieu (facultatif)</span>
              <input
                list="agenda-lieux"
                value={lieu}
                onChange={(e) => setLieu(e.target.value)}
                maxLength={80}
                placeholder={statut === "DEPLACEMENT" ? "Ville, client…" : "Bâtiment, salle…"}
                className="w-full rounded-lg border border-black/10 bg-brand-cream/60 px-3 py-2 text-sm focus-ring outline-none"
              />
              <datalist id="agenda-lieux">
                {lieuxConnus.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand-dark/60">Précision (facultatif)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="ex. joignable par téléphone" className="w-full rounded-lg border border-black/10 bg-brand-cream/60 px-3 py-2 text-sm focus-ring outline-none" />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={loading}>{loading ? "…" : "Ajouter"}</Button>
            {message && <span className={`text-sm font-semibold ${erreur ? "text-alert-soft" : "text-[#16A34A]"}`}>{message}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <div className="border-b border-black/5 px-5 py-4">
          <h2 className="font-bold text-brand-dark">À venir</h2>
          <p className="mt-0.5 text-xs text-brand-dark/50">Le reste du temps, vous apparaissez « Présent ».</p>
        </div>
        {evenements.length === 0 ? (
          <EmptyState title="Rien de prévu" subtitle="Vous êtes considéré comme présent." />
        ) : (
          <ul className="divide-y divide-black/5">
            {evenements.map((e) => {
              const st = STATUTS_AGENDA[e.statut];
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3" style={{ boxShadow: `inset 3px 0 0 ${st?.couleur || "#999"}` }}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark">
                      {st?.label || e.statut}
                      {e.lieu && <span className="font-normal text-brand-dark/60"> · {e.lieu}</span>}
                    </p>
                    <p className="text-xs text-brand-dark/50">
                      {libellePeriode(e)}
                      {e.note && ` · ${e.note}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => supprimer(e.id)} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-alert-soft hover:bg-alert-soft/10">
                    Supprimer
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
