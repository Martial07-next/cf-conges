"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState } from "./ui";
import EcoleCalendar from "./EcoleCalendar";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function AlternantSection({ entries, tuteurs, tuteurActuelId, couleur }) {
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
        <EcoleCalendar entries={entries} couleur={couleur} />
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

export function TuteurSection({ alternants, couleur }) {
  return (
    <Card>
      <div className="px-6 py-5 border-b border-black/5">
        <h2 className="font-bold text-brand-dark">Suivi de mes alternants</h2>
      </div>
      {alternants.length === 0 ? (
        <EmptyState title="Aucun alternant ne vous a encore choisi comme tuteur" />
      ) : (
        <ul className="divide-y divide-black/5">
          {alternants.map((a) => (
            <li key={a.id} className="px-6 py-4">
              <p className="text-sm font-medium text-brand-dark mb-2">{a.prenom} {a.nom}</p>
              {a.leaveRequests.length === 0 ? (
                <p className="text-xs text-brand-dark/40">Aucune période école renseignée.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {a.leaveRequests.map((r) => (
                    <span
                      key={r.id}
                      className="text-xs border border-black/10 rounded-full px-2.5 py-1 font-medium"
                      style={{ backgroundColor: `${couleur}22` }}
                    >
                      {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
