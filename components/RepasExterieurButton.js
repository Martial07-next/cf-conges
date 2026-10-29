"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Carte « Repas à l'extérieur » du tableau de bord : signale en deux clics
// (sans fenêtre du navigateur) que le ticket restaurant du jour doit être
// retiré, affiche l'état du jour et permet d'annuler une erreur.
export default function RepasExterieurButton({ dejaSignale = false, annulable = true }) {
  const router = useRouter();
  const [signale, setSignale] = useState(dejaSignale);
  // Régularisation faite par le gestionnaire TR : non annulable ici.
  const [parMoi, setParMoi] = useState(annulable);
  const [confirmation, setConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  async function envoyer(method) {
    setLoading(true);
    setErreur("");
    const res = await fetch("/api/repas-exterieur", { method });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setConfirmation(false);
    if (!res.ok && res.status !== 409) {
      setErreur(data.error || "Erreur, réessayez.");
      return;
    }
    setSignale(method === "POST");
    setParMoi(true);
    router.refresh();
  }

  return (
    <div
      className={`mb-6 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 shadow-card transition dark:border-white/10 ${
        signale ? "border-brand-green/40 bg-brand-green/10" : "border-black/5 bg-white dark:bg-brand-night"
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${signale ? "bg-brand-green/25" : "bg-brand-yellow/30"}`} aria-hidden>
        {signale ? "✓" : "🍽️"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-dark">{signale ? "Repas à l'extérieur signalé aujourd'hui" : "Repas à l'extérieur aujourd'hui ?"}</p>
        <p className="text-xs text-brand-dark/55">
          {signale && !parMoi
            ? "Votre ticket restaurant du jour a déjà été régularisé par le gestionnaire TR."
            : signale
            ? "Votre ticket restaurant du jour est retiré. Une erreur ? Vous pouvez annuler."
            : confirmation
              ? "Le ticket restaurant du jour sera retiré. On confirme ?"
              : "Avec les stagiaires ou en déplacement : signalez-le pour régulariser votre ticket du jour."}
        </p>
        {erreur && <p className="mt-1 text-xs font-semibold text-alert-soft">{erreur}</p>}
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        {signale && !parMoi ? null : signale ? (
          <button
            type="button"
            onClick={() => envoyer("DELETE")}
            disabled={loading}
            className="w-full rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-brand-dark hover:bg-black/5 disabled:opacity-50 sm:w-auto dark:border-white/15"
          >
            {loading ? "…" : "Annuler"}
          </button>
        ) : confirmation ? (
          <>
            <button
              type="button"
              onClick={() => envoyer("POST")}
              disabled={loading}
              className="flex-1 rounded-xl bg-[rgb(10_254_107)] px-4 py-2 text-xs font-bold text-[#16231a] hover:brightness-95 disabled:opacity-50 sm:flex-none"
            >
              {loading ? "…" : "Oui, je confirme"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmation(false)}
              disabled={loading}
              className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-brand-dark/70 hover:bg-black/5 sm:flex-none dark:border-white/15"
            >
              Non
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmation(true)}
            className="w-full rounded-xl bg-[rgb(10_254_107)] px-4 py-2 text-xs font-bold text-[#16231a] shadow-sm transition hover:brightness-95 active:scale-[0.98] sm:w-auto"
          >
            🍽️ J'ai mangé à l'extérieur
          </button>
        )}
      </div>
    </div>
  );
}
