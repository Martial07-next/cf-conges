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

export default function UserAdminRow({ user }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [onglets, setOnglets] = useState(user.ongletsActifs?.length ? user.ongletsActifs : defaultOngletsForRole(user.role));

  async function update(field, value) {
    setSaving(true);
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
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
        <p className="text-sm font-medium text-brand-dark">
          {user.prenom} {user.nom}
        </p>
        <p className="text-xs text-brand-dark/50">{user.email}</p>
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
      <td className="px-4 py-3 align-top text-xs text-brand-dark/50">{user.service || "—"}</td>
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
    </tr>
  );
}
