"use client";

import { useState } from "react";

export default function ThemeToggle({ themeActuel }) {
  const [theme, setTheme] = useState(themeActuel || "clair");
  const [loading, setLoading] = useState(false);

  async function choisir(valeur) {
    if (valeur === theme || loading) return;
    setLoading(true);

    // Applique tout de suite, visuellement, sans attendre le serveur.
    document.documentElement.classList.toggle("dark", valeur === "sombre");
    setTheme(valeur);

    await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: valeur }),
    });
    setLoading(false);
  }

  return (
    <div className="inline-flex bg-black/5 dark:bg-white/10 rounded-xl p-1 gap-1">
      <button
        type="button"
        onClick={() => choisir("clair")}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
          theme === "clair" ? "bg-white dark:bg-brand-darker text-brand-dark dark:text-brand-cream shadow-sm" : "text-brand-dark/50 dark:text-brand-cream/50 hover:text-brand-dark dark:hover:text-brand-cream"
        }`}
      >
        ☀️ Clair
      </button>
      <button
        type="button"
        onClick={() => choisir("sombre")}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
          theme === "sombre" ? "bg-white dark:bg-brand-darker text-brand-dark dark:text-brand-cream shadow-sm" : "text-brand-dark/50 dark:text-brand-cream/50 hover:text-brand-dark dark:hover:text-brand-cream"
        }`}
      >
        🌙 Sombre
      </button>
    </div>
  );
}
