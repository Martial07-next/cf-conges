"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./ui";

export default function RepasExterieurButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fait, setFait] = useState(false);

  async function handleClick() {
    if (!confirm("Confirmer : vous avez mangé à l'extérieur aujourd'hui ? Ça retire automatiquement votre ticket restaurant du jour.")) return;
    setLoading(true);
    const res = await fetch("/api/repas-exterieur", { method: "POST" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Erreur.");
      return;
    }
    setFait(true);
    setMessage("Signalé ✓ — merci");
    router.refresh();
  }

  return (
    <Card className="p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="font-semibold text-brand-dark">Repas à l'extérieur aujourd'hui ?</p>
        <p className="text-xs text-brand-dark/60 mt-0.5">Signalez-le en un clic pour régulariser votre ticket restaurant du jour.</p>
      </div>
      <div className="flex items-center gap-3">
        {message && <span className={`text-xs font-medium ${fait ? "text-brand-greendark" : "text-alert-soft"}`}>{message}</span>}
        <button
          onClick={handleClick}
          disabled={loading || fait}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-dark text-brand-cream hover:bg-brand-darker transition-colors disabled:opacity-50"
        >
          {loading ? "…" : fait ? "Signalé" : "🍽 Repas à l'extérieur"}
        </button>
      </div>
    </Card>
  );
}
