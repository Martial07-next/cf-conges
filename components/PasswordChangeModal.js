"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function PasswordChangeModal({ required = false }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!required) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmation) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Votre nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Le mot de passe n'a pas pu être modifié.");
        return;
      }

      await signOut({ callbackUrl: "/login" });
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b160f]/70 p-3 sm:p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
      <div className="w-full max-w-md max-h-[94dvh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-black/10 bg-brand-cream shadow-2xl dark:border-white/10 dark:bg-brand-darker">
        <div className="border-b border-black/5 px-4 py-4 sm:px-6 sm:py-5 dark:border-white/10">
          <div className="mb-2.5 sm:mb-4 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-brand-yellow/20 text-base sm:text-xl">🔐</div>
          <h2 id="password-modal-title" className="text-lg sm:text-xl font-bold text-brand-dark dark:text-brand-cream">
            Créez votre nouveau mot de passe
          </h2>
          <p className="mt-1 text-xs sm:mt-1.5 sm:text-sm leading-relaxed text-brand-dark/55 dark:text-brand-cream/55">
            Votre mot de passe actuel est temporaire. Choisissez-en un nouveau avant de continuer sur CF Congés.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-dark/65 dark:text-brand-cream/65">Mot de passe temporaire actuel</label>
            <input type="password" autoComplete="current-password" required autoFocus value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 sm:py-3 text-sm text-brand-dark outline-none focus-ring dark:border-white/10 dark:bg-white/5 dark:text-brand-cream" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-dark/65 dark:text-brand-cream/65">Nouveau mot de passe</label>
            <input type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 sm:py-3 text-sm text-brand-dark outline-none focus-ring dark:border-white/10 dark:bg-white/5 dark:text-brand-cream" />
            <p className="mt-1.5 text-[11px] text-brand-dark/40 dark:text-brand-cream/40">8 caractères minimum.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-dark/65 dark:text-brand-cream/65">Confirmer le nouveau mot de passe</label>
            <input type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 sm:py-3 text-sm text-brand-dark outline-none focus-ring dark:border-white/10 dark:bg-white/5 dark:text-brand-cream" />
          </div>

          {error && <p className="rounded-xl border border-alert-soft/30 bg-alert-soft/10 px-3.5 py-2.5 text-sm text-alert-soft">{error}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-green px-4 py-2.5 sm:py-3 text-sm font-bold text-[#16231A] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Modification en cours…" : "Enregistrer mon nouveau mot de passe"}
          </button>
          <p className="text-center text-[11px] text-brand-dark/40 dark:text-brand-cream/35">
            Vous serez invité à vous reconnecter après la modification.
          </p>
        </form>
      </div>
    </div>
  );
}
