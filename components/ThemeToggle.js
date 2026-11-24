"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { appliquerTheme, themeValide } from "@/lib/theme";

const CHOIX = [
  { valeur: "noel", label: "Noël", emoji: "🎄", apercu: "linear-gradient(135deg,#B63245 0%,#263B64 55%,#17233C 100%)", detail: "Nuit bleue, neige, guirlandes et or" },
  { valeur: "clair", label: "Clair", emoji: "☀️", apercu: "linear-gradient(135deg,#FFFDF4 0%,#F0F7EC 60%,#0E1712 100%)", detail: "L’apparence habituelle" },
  { valeur: "sombre", label: "Sombre", emoji: "🌙", apercu: "linear-gradient(135deg,#17241B 0%,#0E1712 70%,#0afe6b 140%)", detail: "Reposant pour les yeux" },
];

export default function ThemeToggle({ themeActuel }) {
  const [theme, setTheme] = useState(themeValide(themeActuel));
  const [loading, setLoading] = useState(false);
  const { update } = useSession();

  async function choisir(valeur) {
    if (valeur === theme || loading) return;
    setLoading(true);

    // Applique tout de suite, visuellement, sans attendre le serveur.
    appliquerTheme(valeur);
    setTheme(valeur);

    await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: valeur }),
    });
    // Rafraîchit la session pour que le thème du compte soit à jour partout.
    await update().catch(() => {});
    setLoading(false);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CHOIX.map((c) => {
        const actif = theme === c.valeur;
        return (
          <button
            key={c.valeur}
            type="button"
            onClick={() => choisir(c.valeur)}
            disabled={loading}
            aria-pressed={actif}
            className={`group overflow-hidden rounded-2xl border text-left transition focus-ring ${
              actif ? "border-brand-green ring-2 ring-brand-green/40" : "border-black/10 hover:border-black/20 dark:border-white/10"
            }`}
          >
            <span className="relative block h-16" style={{ background: c.apercu }}>
              {c.valeur === "noel" && <span className="absolute inset-x-0 top-1 text-center text-[10px] tracking-[0.5em] text-white/80">❄ ❄ ❄ ❄</span>}
              {actif && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs font-black text-[#16231A]">✓</span>
              )}
            </span>
            <span className="block px-3.5 py-2.5">
              <span className="block text-sm font-bold text-brand-dark">
                {c.emoji} {c.label}
              </span>
              <span className="block text-xs text-brand-dark/55">{c.detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
