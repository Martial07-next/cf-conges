"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  return (
    <tr className="border-b border-black/5 last:border-0">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-brand-dark">
          {user.prenom} {user.nom}
        </p>
        <p className="text-xs text-brand-dark/50">{user.email}</p>
      </td>
      <td className="px-4 py-3">
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
      <td className="px-4 py-3">
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
      <td className="px-4 py-3 text-xs text-brand-dark/50">{user.service || "—"}</td>
    </tr>
  );
}
