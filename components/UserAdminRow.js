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

const POLES = ["Communication", "Formateurs", "Direction", "Administration", "Bureau d’études"];

const STATUTS = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "ACTIF", label: "Actif" },
  { value: "DESACTIVE", label: "Désactivé" },
];

export default function UserAdminRow({ user, reorderable = false, prevUserId = null, nextUserId = null, readOnly = false, canManageAdminAccess = false, roleVerrouille = false }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState(null);
  const [copied, setCopied] = useState(false);
  const [onglets, setOnglets] = useState(user.ongletsActifs?.length ? user.ongletsActifs : defaultOngletsForRole(user.role));

  async function move(swapWithId) {
    if (!swapWithId) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swapWithId }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Déplacement impossible.");
      return;
    }
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
    <tr className={`group border-b border-black/[0.06] last:border-0 transition-colors dark:border-white/[0.07] ${readOnly ? "bg-black/[0.045] opacity-55 dark:bg-white/[0.04]" : "hover:bg-black/[0.018] dark:hover:bg-white/[0.025]"}`}>
      <td className="px-3 py-3 align-top">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green/15 text-[10px] font-bold uppercase text-brand-greendark dark:text-brand-green">
            {user.prenom?.[0] || ""}{user.nom?.[0] || ""}
          </div>
          <div className="min-w-[150px] flex-1">
        <div className="space-y-1.5">
          <label className="block"><span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Prénom</span><input
            defaultValue={user.prenom}
            disabled={saving || readOnly}
            onBlur={(e) => e.target.value !== user.prenom && update("prenom", e.target.value)}
            className="w-full text-sm font-medium border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none dark:border-white/10 dark:bg-white/5"
          /></label>
          <label className="block"><span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Nom</span><input
            defaultValue={user.nom}
            disabled={saving || readOnly}
            onBlur={(e) => e.target.value !== user.nom && update("nom", e.target.value)}
            className="w-full text-sm font-medium border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none dark:border-white/10 dark:bg-white/5"
          /></label>
        <label className="block"><span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Email</span><input
          type="email"
          defaultValue={user.email}
          disabled={saving || readOnly}
          onBlur={(e) => e.target.value !== user.email && update("email", e.target.value)}
          className="w-full text-xs text-brand-dark/50 border border-transparent hover:border-black/10 focus:border-black/20 rounded px-1.5 py-0.5 bg-transparent focus-ring outline-none"
        /></label>
        </div>
        {error && <p className="text-[10px] text-alert-soft mt-1">{error}</p>}
          </div>
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <label className="block"><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Rôle</span><select
          defaultValue={user.role}
          disabled={saving || readOnly || roleVerrouille}
          title={roleVerrouille ? "Seul l'administrateur peut modifier ce rôle." : undefined}
          onChange={(e) => update("role", e.target.value)}
          className="w-[132px] text-xs font-semibold border border-black/10 rounded-xl px-2.5 py-2 bg-brand-cream/60 focus-ring outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
        >
          {ROLES.filter((r) => r.value !== "ADMIN" || canManageAdminAccess || user.role === "ADMIN").map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select></label>
        <div className="mt-3 border-t border-black/[0.06] pt-2 dark:border-white/10">
          <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Profil</span>
          <label className="flex items-center gap-2 text-xs text-brand-dark/70 dark:text-brand-cream/70">
            <input type="checkbox" disabled={saving || readOnly} defaultChecked={user.estAlternant} onChange={(e) => update("estAlternant", e.target.checked)} className="accent-brand-green h-3.5 w-3.5" />
            Alternant
          </label>
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <label className="block"><span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Statut du compte</span><select
          defaultValue={user.statutCompte}
          disabled={saving || readOnly}
          onChange={(e) => update("statutCompte", e.target.value)}
          className="w-[112px] text-xs font-semibold border border-black/10 rounded-xl px-2.5 py-2 bg-brand-cream/60 focus-ring outline-none dark:border-white/10 dark:bg-white/5"
        >
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select></label>
        <div className="mt-3 border-t border-black/[0.06] pt-2 dark:border-white/10">
          <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Visibilité</span>
          <label className="flex items-center gap-2 text-xs text-brand-dark/70 dark:text-brand-cream/70">
            <input type="checkbox" disabled={saving || readOnly} defaultChecked={user.visiblePlanning} onChange={(e) => update("visiblePlanning", e.target.checked)} className="accent-brand-green h-3.5 w-3.5" />
            Planning équipe
          </label>
          <label className="mt-2 flex items-center gap-2 text-xs text-brand-dark/70 dark:text-brand-cream/70">
            <input type="checkbox" disabled={saving || readOnly} defaultChecked={user.visibleCompta} onChange={(e) => update("visibleCompta", e.target.checked)} className="accent-brand-green h-3.5 w-3.5" />
            Espace comptable
          </label>
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <label className="block"><span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Service</span><input
          defaultValue={user.service || ""}
          disabled={saving || readOnly}
          placeholder="#"
          onBlur={(e) => e.target.value !== (user.service || "") && update("service", e.target.value)}
          className="w-full text-xs text-brand-dark/70 border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none dark:border-white/10 dark:bg-white/5"
        /></label>
        <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Pôle</label>
        <select defaultValue={user.pole || ""} disabled={saving || readOnly} onChange={(e) => update("pole", e.target.value || null)} className="mt-0.5 w-32 rounded-lg border border-black/10 bg-brand-cream/60 px-2 py-1.5 text-xs focus-ring outline-none">
          <option value="">Non défini</option>
          {POLES.map((pole) => <option key={pole} value={pole}>{pole}</option>)}
        </select>
      </td>

      <td className="px-3 py-3 align-top">
        <label className="block text-[9px] text-brand-dark/40 mb-0.5">Entrée</label>
        <input
          type="date"
          defaultValue={user.dateEntree ? new Date(user.dateEntree).toISOString().split("T")[0] : ""}
          disabled={saving || readOnly}
          onBlur={(e) => update("dateEntree", e.target.value || null)}
          className="text-xs border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none w-full"
        />
        <label className="block text-[9px] text-brand-dark/40 mb-0.5 mt-1.5">Sortie</label>
        <input
          type="date"
          defaultValue={user.dateSortie ? new Date(user.dateSortie).toISOString().split("T")[0] : ""}
          disabled={saving || readOnly}
          onBlur={(e) => update("dateSortie", e.target.value || null)}
          className="text-xs border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none w-full"
        />
        <label className="block text-[9px] text-brand-dark/40 mb-0.5 mt-1.5">Naissance</label>
        <input
          type="date"
          defaultValue={user.dateNaissance ? new Date(user.dateNaissance).toISOString().split("T")[0] : ""}
          disabled={saving || readOnly}
          onBlur={(e) => update("dateNaissance", e.target.value || null)}
          className="text-xs border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none w-full"
        />
      </td>

            <td className="px-3 py-3 align-top">
        <div className="w-[172px] rounded-xl border border-black/[0.06] bg-black/[0.015] p-2.5 dark:border-white/10 dark:bg-white/[0.025]">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Accès aux espaces</p>
          <div className="flex flex-col gap-1.5">
          {OPTIONAL_TABS.map((t) => (
            <label key={t.key} className="flex items-center gap-1.5 text-xs text-brand-dark/70">
              <input
                type="checkbox"
                disabled={saving || readOnly || user.role === "ADMIN" || (t.key === "admin" && !canManageAdminAccess)}
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
              disabled={saving || readOnly}
              defaultChecked={user.teletravailAutorise}
              onChange={(e) => update("teletravailAutorise", e.target.checked)}
              className="accent-brand-green w-3.5 h-3.5"
            />
            Télétravail autorisé
          </label>
          {user.teletravailAutorise && (
            <select
              defaultValue={user.teletravailJoursMax || 1}
              disabled={saving || readOnly}
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
              disabled={saving || readOnly}
              defaultChecked={user.accesRepasExterieur}
              onChange={(e) => update("accesRepasExterieur", e.target.checked)}
              className="accent-brand-green w-3.5 h-3.5"
            />
            Repas extérieur (auto-régularisation TR)
          </label>
          </div>
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        {readOnly && <p className="mb-2 text-[10px] font-semibold text-brand-dark/45 dark:text-brand-cream/45">Compte ADMIN protégé</p>}
        <div className="flex w-[104px] flex-col gap-2 pr-1">
          {reorderable && (
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[9px] font-bold uppercase tracking-wide text-brand-dark/35 dark:text-brand-cream/35">Position</span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => move(prevUserId)}
                disabled={saving || readOnly || !prevUserId}
                title="Monter"
                className="w-5 h-5 flex items-center justify-center rounded border border-black/10 hover:bg-black/5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↑
              </button>
              <button
                onClick={() => move(nextUserId)}
                disabled={saving || readOnly || !nextUserId}
                title="Descendre"
                className="w-5 h-5 flex items-center justify-center rounded border border-black/10 hover:bg-black/5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↓
              </button>
            </div>
            </div>
          )}
          <button
            onClick={reinitialiserMotDePasse}
            disabled={saving || readOnly}
            title="Générer un mot de passe temporaire"
            className="rounded-lg border border-black/10 px-2.5 py-2 text-left text-xs font-semibold text-brand-greendark transition hover:bg-brand-green/10 disabled:opacity-50 dark:border-white/10"
          >
            Réinit. mdp
          </button>
          <button
            onClick={remove}
            disabled={saving || readOnly}
            className="rounded-lg border border-alert-soft/20 px-2.5 py-2 text-left text-xs font-semibold text-alert-soft transition hover:bg-alert-soft/10 disabled:opacity-50"
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
                Pour {user.prenom} {user.nom} communiquez-le au collaborateur, il devra le changer dès sa prochaine connexion.
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
