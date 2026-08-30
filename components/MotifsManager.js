"use client";

import { useState } from "react";
import { Button, Card } from "./ui";

export default function MotifsManager({ leaveTypes, initialMotifs }) {
  const [selectedTypeId, setSelectedTypeId] = useState(leaveTypes.find((t) => t.code === "ASA")?.id || leaveTypes[0]?.id || "");
  const [motifs, setMotifs] = useState(initialMotifs);
  const [libelle, setLibelle] = useState("");
  const [jours, setJours] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const motifsForType = motifs.filter((m) => m.leaveTypeId === selectedTypeId);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/motifs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveTypeId: selectedTypeId, libelle, jours }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erreur.");
      return;
    }
    setMotifs((prev) => [...prev, data]);
    setLibelle("");
    setJours("");
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce motif ?")) return;
    const res = await fetch(`/api/motifs/${id}`, { method: "DELETE" });
    if (res.ok) setMotifs((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between gap-4">
          <h2 className="font-bold text-brand-dark">Motifs à durée fixe</h2>
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="text-xs font-medium border border-black/10 rounded-lg px-2.5 py-1.5 bg-brand-cream/60 focus-ring outline-none"
          >
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} {t.libelle}
              </option>
            ))}
          </select>
        </div>
        {motifsForType.length === 0 ? (
          <p className="text-sm text-brand-dark/50 px-6 py-8 text-center">Aucun motif pour ce type (durée libre par défaut.)</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {motifsForType.map((m) => (
              <li key={m.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                <span className="text-sm text-brand-dark">{m.libelle}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-brand-dark bg-black/5 px-2 py-1 rounded-full">{m.jours} j</span>
                  <button onClick={() => handleDelete(m.id)} className="text-xs font-semibold text-alert-soft hover:underline">
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 h-fit">
        <h2 className="font-bold text-brand-dark mb-4">Nouveau motif</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Libellé</label>
            <input
              required
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="ex: Mariage du collaborateur"
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Nombre de jours</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              required
              value={jours}
              onChange={(e) => setJours(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>
          {error && <p className="text-xs text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            Ajouter
          </Button>
        </form>
      </Card>
    </div>
  );
}
