"use client";

import { useState } from "react";
import { Button, Card } from "./ui";

const emptyForm = { code: "", libelle: "", couleur: "#6CB64D", comptabiliseSolde: false, demandable: true, plafondAnnuel: "" };

export default function LeaveTypeManager({ initialTypes }) {
  const [types, setTypes] = useState(initialTypes);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function startEdit(t) {
    setEditingId(t.id);
    setForm({
      code: t.code,
      libelle: t.libelle,
      couleur: t.couleur,
      comptabiliseSolde: t.comptabiliseSolde,
      demandable: t.demandable,
      plafondAnnuel: t.plafondAnnuel ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = editingId ? `/api/leave-types/${editingId}` : "/api/leave-types";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erreur.");
      return;
    }

    if (editingId) {
      setTypes((prev) => prev.map((t) => (t.id === editingId ? data : t)));
    } else {
      setTypes((prev) => [...prev, data]);
    }
    resetForm();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce type de congé ? Cette action est irréversible.")) return;
    const res = await fetch(`/api/leave-types/${id}`, { method: "DELETE" });
    if (res.ok) setTypes((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-brand-dark/50 border-b border-black/5">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Libellé</th>
              <th className="px-4 py-3">Plafond</th>
              <th className="px-4 py-3">Décompte solde</th>
              <th className="px-4 py-3">Demandable</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-brand-dark">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.couleur }} />
                    {t.code}
                  </span>
                </td>
                <td className="px-4 py-3 text-brand-dark/70">{t.libelle}</td>
                <td className="px-4 py-3 text-brand-dark/70">{t.plafondAnnuel ?? "—"}</td>
                <td className="px-4 py-3 text-brand-dark/70">{t.comptabiliseSolde ? "Oui" : "Non"}</td>
                <td className="px-4 py-3 text-brand-dark/70">{t.demandable ? "Oui" : "Non"}</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => startEdit(t)} className="text-xs font-semibold text-brand-greendark hover:underline">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="text-xs font-semibold text-alert-soft hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-6 h-fit">
        <h2 className="font-bold text-brand-dark mb-4">{editingId ? "Modifier le type" : "Nouveau type de congé"}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Code</label>
            <input
              required
              disabled={!!editingId}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="ex: CP"
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Libellé</label>
            <input
              required
              value={form.libelle}
              onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Couleur</label>
              <input
                type="color"
                value={form.couleur}
                onChange={(e) => setForm((f) => ({ ...f, couleur: e.target.value }))}
                className="w-full h-9 rounded-lg border border-black/10 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Plafond annuel</label>
              <input
                type="number"
                min="0"
                value={form.plafondAnnuel}
                onChange={(e) => setForm((f) => ({ ...f, plafondAnnuel: e.target.value }))}
                placeholder="illimité"
                className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-dark/70">
            <input
              type="checkbox"
              checked={form.comptabiliseSolde}
              onChange={(e) => setForm((f) => ({ ...f, comptabiliseSolde: e.target.checked }))}
              className="accent-brand-green w-4 h-4"
            />
            Décompte du solde de congés
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-dark/70">
            <input
              type="checkbox"
              checked={form.demandable}
              onChange={(e) => setForm((f) => ({ ...f, demandable: e.target.checked }))}
              className="accent-brand-green w-4 h-4"
            />
            Le collaborateur peut le demander
          </label>

          {error && <p className="text-xs text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading} className="flex-1">
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
