"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error === "EN_ATTENTE_VALIDATION") {
        setError("Votre compte est créé mais attend encore la validation d'accès de l'employeur.");
      } else if (res.error === "COMPTE_DESACTIVE") {
        setError("Ce compte a été désactivé. Contactez l'administrateur.");
      } else {
        setError("Email ou mot de passe incorrect.");
      }
      return;
    }

    router.push(searchParams.get("from") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo dark />
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-black/5 p-7">
          <h1 className="text-lg font-bold text-brand-dark mb-1">Connexion</h1>
          <p className="text-sm text-brand-dark/60 mb-6">Accédez à votre espace congés CF Réseaux.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-dark/70 mb-1.5">Email professionnel</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@cf-reseaux.fr"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark/70 mb-1.5">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-brand-dark/60 mt-5">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-semibold text-brand-greendark hover:underline">
            Créer un accès
          </Link>
        </p>
      </div>
    </div>
  );
}
