"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/Logo";

const DOMAINE = "cf-reseaux.fr";

function LoginContent() {
  const searchParams = useSearchParams();
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [echecs, setEchecs] = useState(0);

  useEffect(() => {
    const sauvegarde = Number(sessionStorage.getItem("cf-login-echecs") || "0");
    if (Number.isFinite(sauvegarde) && sauvegarde > 0) setEchecs(sauvegarde);
  }, []);

  function enregistrerEchec() {
    setEchecs((n) => {
      const suivant = n + 1;
      sessionStorage.setItem("cf-login-echecs", String(suivant));
      return suivant;
    });
  }

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
          enregistrerEchec();
        }
        setLoading(false);
        return;
      }

                  // Attend que le cookie de session soit bien pris en compte avant de
      // rediriger (jusqu'a 2,4s au total sur les connexions/navigateurs plus
      // lents). Meme si la verification echoue malgre tout, on tente quand
      // meme la redirection ensuite plutot que de bloquer sur une erreur.
      for (let tentative = 0; tentative < 8; tentative++) {
        const session = await getSession();
        if (session?.user) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      // Une connexion réussie remet le compteur local d'échecs à zéro.
      sessionStorage.removeItem("cf-login-echecs");
      setEchecs(0);

      // Rechargement complet (pas une navigation "douce" Next.js) : garantit
      // que la requete suivante part avec le cookie desormais confirme.
      window.location.href = searchParams.get("from") || "/dashboard";
    } catch (err) {
      setError(`Erreur technique : ${err?.message || "cause inconnue"}. Réessaie, ou contacte l'administrateur si ça persiste.`);
      setLoading(false);
    }
  }
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f5fff2] dark:bg-[#0e1712]">
      {/* Photo d'équipe : fond plein écran sur mobile, moitié gauche sur grand
          écran, fondue progressivement dans la couleur de la page pour éviter
          toute cassure nette entre la photo et le formulaire. */}
      <div className="absolute inset-0 lg:right-[40%]">
        <Image
          src="/equipe.jpg"
          alt="Équipe CF Réseaux"
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover object-center"
        />
        {/* Mobile : voile sombre pour garder le formulaire lisible */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e1712]/70 via-[#0e1712]/45 to-[#0e1712]/80 lg:hidden" />
        {/* Grand écran : ombre en bas pour le texte */}
        <div className="absolute inset-0 hidden lg:block bg-gradient-to-t from-[#0e1712]/85 via-[#0e1712]/25 to-[#0e1712]/5 dark:from-[#0e1712] dark:via-[#0e17123d] dark:to-[#0e1712]" />
        {/* Grand écran : fondu vers la couleur de la page */}
        <div className="absolute inset-y-0 right-0 hidden lg:block w-2/5 bg-gradient-to-r from-transparent via-[#f5fff2]/50 to-[#f5fff2] dark:via-[#0e1712]/50 dark:to-[#0e1712]" />
      </div>

      {/* Accroche (grand écran) */}
      <div className="absolute bottom-0 left-0 z-10 hidden lg:block p-12 text-brand-cream max-w-md">
        <p className="text-2xl font-bold leading-snug">L'équipe qui fait vivre CF Réseaux, au quotidien.</p>
        <p className="text-sm text-brand-cream/70 mt-3">Gestion des congés &amp; du planning d'équipe</p>
      </div>

      {/* Formulaire : centré sur mobile, dans la partie droite sur grand écran */}
      <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:ml-[55%] lg:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <div className="lg:hidden lg:dark:block">
              <Logo />
            </div>
            <div className="hidden lg:block lg:dark:hidden">
              <Logo dark />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl lg:shadow-card border border-black/5 p-7">
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
                  3 tentatives ont échoué. Si vous avez oublié votre mot de passe, demandez à l’administrateur de réinitialiser votre accès. Un mot de passe temporaire vous sera communiqué et devra être modifié à la prochaine connexion.
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

            <p className="text-center text-sm text-brand-dark/60 mt-5 pt-5 border-t border-black/5">
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


export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-cream">
          <div className="text-center">
            <div className="text-3xl mb-3 animate-bounce">⚡</div>
            <p className="text-sm font-semibold text-brand-dark">Chargement de CF Congés...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
