"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

const DOMAINE = "cf-reseaux.fr";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [echecs, setEchecs] = useState(0);

  function handleEmailChange(e) {
    // Si la personne colle une adresse complete (avec @...), on ne garde que
    // la partie avant le @ pour eviter un domaine double.
    const valeur = e.target.value;
    setEmailPrefix(valeur.includes("@") ? valeur.split("@")[0] : valeur);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const email = `${emailPrefix.trim().toLowerCase()}@${DOMAINE}`;

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
        setEchecs((n) => n + 1);
      }
      return;
    }

    setEchecs(0);
    router.push(searchParams.get("from") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo dark />
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-black/5 p-7">
          <h1 className="text-lg font-bold text-brand-dark mb-1">Connexion</h1>
          <p className="text-sm text-brand-dark/60 mb-6">Accédez à votre espace congés CF Réseaux.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-dark/70 mb-1.5">Email professionnel</label>
              <div className="flex rounded-xl border border-black/10 bg-brand-cream/60 overflow-hidden focus-within:ring-2 focus-within:ring-brand-green/50">
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={emailPrefix}
                  onChange={handleEmailChange}
                  placeholder="prenom.nom"
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-sm outline-none"
                />
                <span className="flex items-center px-3 text-sm text-brand-dark/50 bg-black/[0.03] border-l border-black/10 whitespace-nowrap">
                  @{DOMAINE}
                </span>
              </div>
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

            {echecs >= 3 && (
              <p className="text-sm text-brand-dark bg-brand-yellow/15 border border-brand-yellow/40 rounded-xl px-3 py-2">
                Mot de passe oublié ? Contactez votre administrateur ou votre employeur pour réinitialiser votre accès.
              </p>
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
