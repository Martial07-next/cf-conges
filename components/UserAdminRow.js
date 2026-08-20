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
  const [tempPassword, setTempPassword] = useState(null);
  const [copied, setCopied] = useState(false);
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

  async function reinitialiserMotDePasse() {
    if (!confirm(`Générer un nouveau mot de passe temporaire pour ${user.prenom} ${user.nom} ?`)) return;
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reinitialiserMotDePasse: true }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      alert(data.error || "Erreur.");
      return;
    }
    setCopied(false);
    setTempPassword(data.tempPassword);
    router.refresh();
  }

  async function copierMotDePasse() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
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

          <label className="flex items-center gap-1.5 text-xs text-brand-dark/70 pt-1 mt-1 border-t border-black/5">
            <input
              type="checkbox"
              disabled={saving}
              defaultChecked={user.visiblePlanning}
              onChange={(e) => update("visiblePlanning", e.target.checked)}
              className="accent-brand-green w-3.5 h-3.5"
            />
            Planning équipe
          </label>

          <label className="flex items-center gap-1.5 text-xs text-brand-dark/70 pt-1 mt-1 border-t border-black/5">
            <input
              type="checkbox"
              disabled={saving}
              defaultChecked={user.teletravailAutorise}
              onChange={(e) => update("teletravailAutorise", e.target.checked)}
              className="accent-brand-green w-3.5 h-3.5"
            />
            Télétravail autorisé
          </label>
          {user.teletravailAutorise && (
            <select
              defaultValue={user.teletravailJoursMax || 1}
              disabled={saving}
              onChange={(e) => update("teletravailJoursMax", Number(e.target.value))}
              className="text-xs border border-black/10 rounded-lg px-2 py-1 bg-brand-cream/60 focus-ring outline-none ml-5"
            >
              <option value={1}>1 jour / semaine</option>
              <option value={2}>2 jours / semaine</option>
            </select>
          )}

          <label className="flex items-center gap-1.5 text-xs text-brand-dark/70 pt-1 mt-1 border-t border-black/5">
            <input
              type="checkbox"
              disabled={saving}
              defaultChecked={user.estAlternant}
              onChange={(e) => update("estAlternant", e.target.checked)}
              className="accent-brand-green w-3.5 h-3.5"
            />
            Alternant
          </label>
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
            onClick={reinitialiserMotDePasse}
            disabled={saving}
            title="Générer un mot de passe temporaire"
            className="text-xs font-semibold text-brand-greendark hover:underline disabled:opacity-50"
          >
            Réinit. mdp
          </button>
          <button
            onClick={remove}
            disabled={saving}
            className="text-xs font-semibold text-alert-soft hover:underline disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </td>

      {tempPassword && (
        <td className="p-0 border-0" style={{ width: 0 }}>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setTempPassword(null)} />
          <div className="fixed z-50 inset-0 flex items-center justify-center px-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-card border border-black/5 p-6 max-w-sm w-full pointer-events-auto">
              <h3 className="font-bold text-brand-dark mb-1">Mot de passe temporaire</h3>
              <p className="text-xs text-brand-dark/50 mb-4">
                Pour {user.prenom} {user.nom} — communiquez-le au collaborateur, il devra le changer dès sa prochaine connexion.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <input
                  readOnly
                  value={tempPassword}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm font-mono text-brand-dark"
                />
                <button
                  onClick={copierMotDePasse}
                  className="px-3.5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-greendark text-sm font-semibold text-brand-dark shrink-0"
                >
                  {copied ? "Copié ✓" : "Copier"}
                </button>
              </div>
              <button
                onClick={() => setTempPassword(null)}
                className="text-xs font-semibold text-brand-dark/50 hover:underline"
              >
                Fermer
              </button>
            </div>
          </div>
        </td>
      )}
    </tr>
  );
}
