"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

export default function AdminLeaveEntryForm({ users, leaveTypes }) {
  const router = useRouter();

  const [userId, setUserId] = useState(users[0]?.id || "");
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || "");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [demiJournee, setDemiJournee] = useState(false);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/leave-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          leaveTypeId,
          dateDebut,
          dateFin,
          demiJournee,
          motif,
        }),
      });

      let data = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(
          data.error ||
            `Erreur lors de l'ajout du congé (${res.status}).`
        );
        return;
      }

      setSuccess(true);

      setDateDebut("");
      setDateFin("");
      setMotif("");
      setDemiJournee(false);

      router.refresh();

      setTimeout(() => {
        setSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Erreur ajout congé admin :", error);
      setError(
        "Impossible de contacter le serveur. Vérifiez votre connexion ou réessayez."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-bold text-brand-dark mb-4">
        Ajouter un congé déjà pris
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">
              Collaborateur
            </label>

            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                  {u.service ? ` — ${u.service}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">
              Type de congé
            </label>

            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              required
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.libelle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">
              Du
            </label>

            <input
              type="date"
              required
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">
              Au
            </label>

            <input
              type="date"
              required
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-brand-dark/70">
          <input
            type="checkbox"
            checked={demiJournee}
            onChange={(e) => setDemiJournee(e.target.checked)}
            className="accent-brand-green w-4 h-4"
          />

          Demi-journée
        </label>

        <div>
          <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">
            Commentaire (optionnel)
          </label>

          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="ex : saisi rétroactivement"
            className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
          />
        </div>

        {error && (
          <p className="text-xs text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {success && (
          <p className="text-xs text-brand-greendark bg-brand-green/10 border border-brand-green/30 rounded-lg px-3 py-2">
            Ajouté ✓
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Ajout…" : "Ajouter ce congé"}
        </Button>
      </form>
    </Card>
  );
}
