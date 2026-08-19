"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function TRRegularisationForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [eligibles, setEligibles] = useState(null);
  const [selection, setSelection] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function charger() {
    setError("");
    setLoading(true);
    setEligibles(null);
    const res = await fetch(`/api/tr?date=${date}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur.");
      return;
    }
    setEligibles(data);
    setSelection(new Set(data.filter((u) => u.dejaRegularise).map((u) => u.id)));
  }

  function toggle(id) {
    const next = new Set(selection);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelection(next);
  }

  async function valider() {
    if (selection.size === 0) {
      setError("Sélectionnez au moins un collaborateur.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/tr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, userIds: Array.from(selection) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur.");
      return;
    }
    setOpen(false);
    setEligibles(null);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        Faire une régularisation
      </Button>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-brand-dark">Régularisation ticket restaurant</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-brand-dark/50 hover:underline">
          fermer
        </button>
      </div>
      <p className="text-xs text-brand-dark/50 mb-4">
        Choisissez le jour où le restaurant a été payé par l'entreprise, puis cochez les collaborateurs concernés
        (même s'ils ont travaillé ce jour-là, un ticket leur sera retiré pour ce mois).
      </p>

      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-brand-dark/60 mb-1">Date du repas</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-black/10 rounded-lg px-3 py-2 bg-brand-cream/60 focus-ring outline-none"
          />
        </div>
        <Button variant="ghost" disabled={loading} onClick={charger}>
          {loading ? "Chargement…" : "Charger les collaborateurs"}
        </Button>
      </div>

      {error && <p className="text-xs text-alert-soft mb-3">{error}</p>}

      {eligibles && (
        <>
          {eligibles.length === 0 ? (
            <p className="text-sm text-brand-dark/50 mb-4">
              Aucun collaborateur n'a travaillé ce jour-là (week-end ou tout le monde en congé).
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto">
              {eligibles.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 text-sm text-brand-dark/80 px-3 py-2 rounded-lg border border-black/5 hover:bg-black/[0.02]"
                >
                  <input
                    type="checkbox"
                    checked={selection.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="accent-brand-green w-4 h-4"
                  />
                  {u.prenom} {u.nom}
                  {u.dejaRegularise && <span className="text-[10px] text-brand-dark/40 ml-1">(déjà régularisé)</span>}
                </label>
              ))}
            </div>
          )}
          {eligibles.length > 0 && (
            <Button variant="danger" disabled={loading} onClick={valider}>
              {loading ? "Enregistrement…" : `Retirer 1 ticket à ${selection.size} collaborateur(s)`}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
