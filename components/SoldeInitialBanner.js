"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

export default function SoldeInitialBanner() {
  const router = useRouter();
  const [joursRestants, setJoursRestants] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/profil/solde-initial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joursRestants }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erreur.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) return null;

  return (
    <Card className="p-5 mb-6 border-brand-yellow/50 bg-brand-yellow/5">
      <div className="flex items-start gap-3">
        <span className="text-xl">👋</span>
        <div className="flex-1">
          <p className="font-bold text-brand-dark mb-1">Bienvenue — une dernière étape</p>
          <p className="text-sm text-brand-dark/70 mb-3">
            Pour que votre solde de congés payés soit exact, indiquez combien de jours de CP il vous reste
            actuellement (d'après votre dernier bulletin de paie par exemple). L'application les créditera
            ensuite automatiquement, à raison de 2,5 jours le 1er de chaque mois.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0"
              required
              value={joursRestants}
              onChange={(e) => setJoursRestants(e.target.value)}
              placeholder="ex : 12.5"
              className="w-32 px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus-ring outline-none"
            />
            <span className="text-sm text-brand-dark/60">jours de CP restants</span>
            <Button type="submit" disabled={loading} className="ml-2">
              {loading ? "Enregistrement…" : "Valider"}
            </Button>
          </form>
          {error && <p className="text-sm text-alert-soft mt-2">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
