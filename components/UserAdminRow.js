"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OPTIONAL_TABS, defaultOngletsForRole } from "@/lib/permissions";

const ROLES = [
  { value: "COLLABORATEUR", label: "Collaborateur" },
  { value: "COMPTABLE", label: "Comptable" },
  { value: "EMPLOYEUR", label: "Employeur / RH" },
  { value: "ADMIN", label: "Administrateur" },
];

const STATUTS = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "ACTIF", label: "Actif" },
  { value: "DESACTIVE", label: "Désactivé" },
];

export default function UserAdminRow({ user, reorderable = false, prevUserId = null, nextUserId = null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [onglets, setOnglets] = useState(user.ongletsActifs?.length ? user.ongletsActifs : defaultOngletsForRole(user.role));

  async function move(swapWithId) {
    if (!swapWithId) return;
    setSaving(true);
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swapWithId }),
    });
    setSaving(false);
    router.refresh();
  }

  async function update(field, value) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Supprimer définitivement ${user.prenom} ${user.nom} ?`)) return;
    setSaving(true);
    await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    setSaving(false);
    router.refresh();
  }

  function toggleOnglet(tab) {
    const next = onglets.includes(tab) ? onglets.filter((o) => o !== tab) : [...onglets, tab];
    setOnglets(next);
    update("ongletsActifs", next);
  }

  return (
    <tr className="border-b border-black/5 last:border-0">
      <td className="px-4 py-3 align-top">
        <div className="flex gap-1.5 mb-1">
          <input
            defaultValue={user.prenom}
            disabled={saving}
            onBlur={(e) => e.target.value !== user.prenom && update("prenom", e.target.value)}
            className="w-20 text-sm font-medium border border-transparent hover:border-black/10 focus:border-black/20 rounded px-1.5 py-0.5 bg-transparent focus-ring outline-none"
          />
          <input
            defaultValue={user.nom}
            disabled={saving}
            onBlur={(e) => e.target.value !== user.nom && update("nom", e.target.value)}
            className="w-24 text-sm font-medium border border-transparent hover:border-black/10 focus:border-black/20 rounded px-1.5 py-0.5 bg-transparent focus-ring outline-none"
          />
        </div>
        <input
          type="email"
          defaultValue={user.email}
          disabled={saving}
          onBlur={(e) => e.target.value !== user.email && update("email", e.target.value)}
          className="w-full text-xs text-brand-dark/50 border border-transparent hover:border-black/10 focus:border-black/20 rounded px-1.5 py-0.5 bg-transparent focus-ring outline-none"
        />
        {error && <p className="text-[10px] text-alert-soft mt-1">{error}</p>}
      </td>

      <td className="px-4 py-3 align-top">
        <select
          defaultValue={user.role}
          disabled={saving}
          onChange={(e) => update("role", e.target.value)}
          className="text-xs font-medium border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3 align-top">
        <select
          defaultValue={user.statutCompte}
          disabled={saving}
          onChange={(e) => update("statutCompte", e.target.value)}
          className="text-xs font-medium border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none"
        >
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3 align-top">
        <input
          defaultValue={user.service || ""}
          disabled={saving}
          placeholder="—"
          onBlur={(e) => e.target.value !== (user.service || "") && update("service", e.target.value)}
          className="w-28 text-xs text-brand-dark/50 border border-transparent hover:border-black/10 focus:border-black/20 rounded px-1.5 py-0.5 bg-transparent focus-ring outline-none"
        />
      </td>

      <td className="px-4 py-3 align-top">
        <input
          type="date"
          defaultValue={user.dateEntree ? new Date(user.dateEntree).toISOString().split("T")[0] : ""}
          disabled={saving}
          onChange={(e) => update("dateEntree", e.target.value)}
          className="text-xs border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none"
        />
      </td>

      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-1">
          {OPTIONAL_TABS.map((t) => (
            <label key={t.key} className="flex items-center gap-1.5 text-xs text-brand-dark/70">
              <input
                type="checkbox"
                disabled={saving || user.role === "ADMIN"}
                checked={user.role === "ADMIN" ? true : onglets.includes(t.key)}
                onChange={() => toggleOnglet(t.key)}
                className="accent-brand-green w-3.5 h-3.5"
              />
              {t.label}
            </label>
          ))}
        </div>
      </td>

      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          {reorderable && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => move(prevUserId)}
                disabled={saving || !prevUserId}
                title="Monter"
                className="w-5 h-5 flex items-center justify-center rounded border border-black/10 hover:bg-black/5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↑
              </button>
              <button
                onClick={() => move(nextUserId)}
                disabled={saving || !nextUserId}
                title="Descendre"
                className="w-5 h-5 flex items-center justify-center rounded border border-black/10 hover:bg-black/5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↓
              </button>
            </div>
          )}
          <button
            onClick={remove}
            disabled={saving}
            className="text-xs font-semibold text-alert-soft hover:underline disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </td>
    </tr>
  );
}
