"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

export default function RequestForm({ leaveTypes }) {
  const router = useRouter();
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || "");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [demiJournee, setDemiJournee] = useState(false);
  const [exceptionnelle, setExceptionnelle] = useState(false);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/leave-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveTypeId, dateDebut, dateFin, demiJournee, exceptionnelle, motif }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Une erreur est survenue.");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/mes-demandes"), 1200);
  }

  if (success) {
    return (
      <Card className="p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <p className="font-bold text-brand-dark">Demande envoyée</p>
        <p className="text-sm text-brand-dark/60 mt-1">Vous serez notifié dès qu'elle sera traitée.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-7">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Etape 1 : type de conge - un clic */}
        <div>
          <label className="block text-xs font-semibold text-brand-dark/70 mb-2.5">1. Type de congé</label>
          <div className="flex flex-wrap gap-2">
            {leaveTypes.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setLeaveTypeId(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors focus-ring ${
                  leaveTypeId === t.id
                    ? "border-brand-green bg-brand-green/15 text-brand-dark"
                    : "border-black/10 text-brand-dark/70 hover:border-black/20"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.couleur }} />
                {t.libelle}
              </button>
            ))}
          </div>
        </div>

        {/* Etape 2 : dates */}
        <div>
          <label className="block text-xs font-semibold text-brand-dark/70 mb-2.5">2. Dates</label>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] text-brand-dark/50 mb-1">Du</span>
              <input
                type="date"
                required
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
            <div>
              <span className="block text-[11px] text-brand-dark/50 mb-1">Au</span>
              <input
                type="date"
                required
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-brand-dark/70">
            <input type="checkbox" checked={demiJournee} onChange={(e) => setDemiJournee(e.target.checked)} className="accent-brand-green w-4 h-4" />
            Demi-journée
          </label>
        </div>

        {/* Exceptionnelle */}
        <div className="rounded-xl border border-black/10 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-brand-dark">
            <input
              type="checkbox"
              checked={exceptionnelle}
              onChange={(e) => setExceptionnelle(e.target.checked)}
              className="accent-brand-yellow w-4 h-4"
            />
            Demande exceptionnelle (préavis raccourci)
          </label>
          {exceptionnelle && (
            <p className="text-xs text-brand-dark/50 mt-2">
              Cette demande sera signalée en priorité à votre employeur. Le motif ci-dessous devient obligatoire.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-dark/70 mb-2.5">
            Commentaire {exceptionnelle && <span className="text-alert-soft">(obligatoire)</span>}
          </label>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            required={exceptionnelle}
            rows={3}
            placeholder="Précisez le motif si nécessaire…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-xl px-3 py-2">{error}</p>}

        {/* Etape 3 : envoi - un clic */}
        <Button type="submit" disabled={loading || !leaveTypeId} className="w-full">
          {loading ? "Envoi…" : "3. Envoyer la demande"}
        </Button>
      </form>
    </Card>
  );
}
