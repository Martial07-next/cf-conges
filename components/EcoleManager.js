"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState } from "./ui";
import EcoleCalendar from "./EcoleCalendar";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function AlternantSection({ entries, tuteurs, tuteurActuelId }) {
  const router = useRouter();
  const [tuteurId, setTuteurId] = useState(tuteurActuelId || "");

  async function handleDelete(id) {
    if (!confirm("Retirer cette période école ?")) return;
    const res = await fetch(`/api/ecole/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function handleTuteurChange(id) {
    setTuteurId(id);
    await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tuteurId: id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="font-bold text-brand-dark mb-1">Mon tuteur</h2>
        <p className="text-sm text-brand-dark/60 mb-4">Il pourra suivre vos périodes école depuis son propre espace.</p>
        <select
          value={tuteurId}
          onChange={(e) => handleTuteurChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none min-w-[240px]"
        >
          <option value="">— Choisir un tuteur —</option>
          {tuteurs.map((t) => (
            <option key={t.id} value={t.id}>{t.prenom} {t.nom}{t.service ? ` — ${t.service}` : ""}</option>
          ))}
        </select>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold text-brand-dark mb-4">Mes jours d'école</h2>
        <EcoleCalendar entries={entries} />
      </Card>

      <Card>
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Périodes enregistrées</h2>
        </div>
        {entries.length === 0 ? (
          <EmptyState title="Aucune période école ajoutée" />
        ) : (
          <ul className="divide-y divide-black/5">
            {entries.map((e) => (
              <li key={e.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                <span className="text-sm text-brand-dark">{formatDate(e.dateDebut)} → {formatDate(e.dateFin)}</span>
                <button onClick={() => handleDelete(e.id)} className="text-xs font-semibold text-alert-soft hover:underline">Retirer</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
