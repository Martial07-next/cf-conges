"use client";

import { useState } from "react";
import { Button, Card } from "./ui";

const ROLE_LABEL = {
  COLLABORATEUR: "Collaborateur",
  COMPTABLE: "Comptable",
  EMPLOYEUR: "Employeur / RH",
  ADMIN: "Administrateur",
};

export default function ProfileForm({ user }) {
  const [recevoirEmails, setRecevoirEmails] = useState(user.recevoirEmails);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function savePreference(value) {
    setRecevoirEmails(value);
    await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recevoirEmails: value }),
    });
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erreur.");
      return;
    }
    setSuccess("Mot de passe mis à jour.");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="font-bold text-brand-dark mb-4">Informations</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Nom complet</dt>
            <dd className="font-medium text-brand-dark">
              {user.prenom} {user.nom}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Email</dt>
            <dd className="font-medium text-brand-dark">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Rôle</dt>
            <dd className="font-medium text-brand-dark">{ROLE_LABEL[user.role]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Service</dt>
            <dd className="font-medium text-brand-dark">{user.service || "—"}</dd>
          </div>
        </dl>

        <div className="mt-6 pt-5 border-t border-black/5">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-brand-dark/70">Recevoir les notifications par email</span>
            <input
              type="checkbox"
              checked={recevoirEmails}
              onChange={(e) => savePreference(e.target.checked)}
              className="accent-brand-green w-4 h-4"
            />
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold text-brand-dark mb-4">Changer de mot de passe</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>

          {error && <p className="text-sm text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-xl px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-brand-greendark bg-brand-green/10 border border-brand-green/30 rounded-xl px-3 py-2">{success}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : "Mettre à jour"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
