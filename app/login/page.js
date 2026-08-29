"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

const DOMAINE = "cf-reseaux.fr";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [echecs, setEchecs] = useState(0);

  function handleEmailChange(e) {
    const valeur = e.target.value;
    setEmailPrefix(valeur.includes("@") ? valeur.split("@")[0] : valeur);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const email = `${emailPrefix.trim().toLowerCase()}@${DOMAINE}`;

      const res = await signIn("credentials", { email, password, redirect: false });

      if (res?.error) {
        if (res.error === "EN_ATTENTE_VALIDATION") {
          setError("Votre compte est créé mais attend encore la validation d'accès de l'employeur.");
        } else if (res.error === "COMPTE_DESACTIVE") {
          setError("Ce compte a été désactivé. Contactez l'administrateur.");
        } else {
          setError("Email ou mot de passe incorrect.");
          setEchecs((n) => n + 1);
        }
        setLoading(false);
        return;
      }

            // Court delai pour laisser le temps au cookie de session d'etre
      // ecrit avant la navigation, sans bloquer sur une verification
      // qui peut elle-meme echouer a tort sur certains navigateurs mobiles.
      await new Promise((r) => setTimeout(r, 300));

      // Rechargement complet (pas une navigation "douce" Next.js) : garantit
      // que la requete suivante part avec le cookie desormais confirme.
      window.location.href = searchParams.get("from") || "/dashboard";
    } catch (err) {
      setError(`Erreur technique : ${err?.message || "cause inconnue"}. Réessaie, ou contacte l'administrateur si ça persiste.`);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-brand-cream">
      {/* Colonne photo — masquée sur mobile, visible a partir des grands ecrans */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-dark to-brand-greendark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/equipe.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/30 to-brand-dark/10" />

        <div className="relative z-10 flex flex-col justify-end p-12 text-brand-cream">
          <p className="text-2xl font-bold leading-snug max-w-sm">
            L'équipe qui fait vivre CF Réseaux, au quotidien.
          </p>
          <p className="text-sm text-brand-cream/70 mt-3">Gestion des congés &amp; du planning d'équipe</p>
        </div>
      </div>

      {/* Colonne formulaire */}
      <div className="flex-1 flex flex-col px-6 py-8 sm:px-10">
        <div className="mb-10 lg:mb-16">
          <Logo dark />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
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
                      placeholder="pnom"
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
                  className="w-full bg-brand-green hover:bg-brand-greendark text-brand-dark hover:text-white font-semibold text-sm py-2.5 rounded-xl transition-colors focus-ring disabled:opacity-60"
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
      </div>
    </div>
  );
}
