"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function InscriptionPage() {
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", password: "", service: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Une erreur est survenue.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <Logo dark />
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-black/5 p-7">
            <div className="w-12 h-12 rounded-full bg-brand-yellow/30 flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
            <h1 className="text-lg font-bold text-brand-dark mb-2">Compte créé</h1>
            <p className="text-sm text-brand-dark/70 mb-6">
              Votre demande d'accès a été transmise. Un employeur ou l'administrateur doit valider votre compte
              avant votre première connexion.
            </p>
            <Link href="/login" className="text-sm font-semibold text-brand-greendark hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo dark />
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-black/5 p-7">
          <h1 className="text-lg font-bold text-brand-dark mb-1">Créer un accès</h1>
          <p className="text-sm text-brand-dark/60 mb-6">Réservé aux adresses @cf-reseaux.fr.</p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-brand-dark/70 mb-1.5">Prénom</label>
                <input
                  required
                  value={form.prenom}
                  onChange={(e) => update("prenom", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-dark/70 mb-1.5">Nom</label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => update("nom", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark/70 mb-1.5">Email professionnel</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="prenom.nom@cf-reseaux.fr"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark/70 mb-1.5">Service</label>
              <input
                value={form.service}
                onChange={(e) => update("service", e.target.value)}
                placeholder="Bureau d'études, Formation…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark/70 mb-1.5">Mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>

            {error && (
              <p className="text-sm text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green hover:bg-brand-greendark text-brand-dark font-semibold text-sm py-2.5 rounded-xl transition-colors focus-ring disabled:opacity-60"
            >
              {loading ? "Envoi…" : "Demander un accès"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-brand-dark/60 mt-5">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-brand-greendark hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
