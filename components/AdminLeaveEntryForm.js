"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

export default function AdminLeaveEntryForm({ users, leaveTypes }) {
  const router = useRouter();

  const [userId, setUserId] = useState(users[0]?.id || "");
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || "");
  const [modeDate, setModeDate] = useState("jour");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [demiJournee, setDemiJournee] = useState(false);
  const [demiJourneePeriode, setDemiJourneePeriode] = useState("MATIN");
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleDateDebutChange(value) {
    setDateDebut(value);
    if (modeDate === "jour") setDateFin(value);
  }

  function handleModeDateChange(mode) {
    setModeDate(mode);
    if (mode === "jour" && dateDebut) setDateFin(dateDebut);
    if (mode === "plage") setDemiJournee(false);
  }

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
          demiJourneePeriode: demiJournee ? demiJourneePeriode : undefined,
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
      setModeDate("jour");

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
                  {u.service ? ` & ${u.service}` : ""}
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
                  {t.code} {t.libelle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inline-flex bg-black/5 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => handleModeDateChange("jour")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              modeDate === "jour" ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            Un seul jour
          </button>
          <button
            type="button"
            onClick={() => handleModeDateChange("plage")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              modeDate === "plage" ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            Plage de dates
          </button>
        </div>

        {modeDate === "jour" ? (
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={dateDebut}
              onChange={(e) => handleDateDebutChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>
        ) : (
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
        )}

        {modeDate === "jour" && (
          <>
            <label className="flex items-center gap-2 text-sm text-brand-dark/70">
              <input
                type="checkbox"
                checked={demiJournee}
                onChange={(e) => setDemiJournee(e.target.checked)}
                className="accent-brand-green w-4 h-4"
              />

              Demi-journée
            </label>

            {demiJournee && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDemiJourneePeriode("MATIN")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    demiJourneePeriode === "MATIN" ? "border-brand-green bg-brand-green/15 text-brand-dark" : "border-black/10 text-brand-dark/60"
                  }`}
                >
                  Matin
                </button>
                <button
                  type="button"
                  onClick={() => setDemiJourneePeriode("APREM")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    demiJourneePeriode === "APREM" ? "border-brand-green bg-brand-green/15 text-brand-dark" : "border-black/10 text-brand-dark/60"
                  }`}
                >
                  Après-midi
                </button>
              </div>
            )}
          </>
        )}

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
