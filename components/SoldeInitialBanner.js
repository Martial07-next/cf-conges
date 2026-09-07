"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

export default function SoldeInitialBanner({ dateEntreeInitiale }) {
  const router = useRouter();
  const [dateEntree, setDateEntree] = useState(
    dateEntreeInitiale ? new Date(dateEntreeInitiale).toISOString().split("T")[0] : ""
  );
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
      body: JSON.stringify({ dateEntree }),
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
            Confirmez votre date d'entrée dans l'entreprise : votre solde de congés payés se calculera
            automatiquement à partir de cette date (proratisé si vous êtes arrivé(e) en cours de mois), sans
            rien d'autre à saisir.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              required
              value={dateEntree}
              onChange={(e) => setDateEntree(e.target.value)}
              className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus-ring outline-none"
            />
            <Button type="submit" disabled={loading} className="ml-2">
              {loading ? "Calcul en cours…" : "Confirmer"}
            </Button>
          </form>
          {error && <p className="text-sm text-alert-soft mt-2">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
