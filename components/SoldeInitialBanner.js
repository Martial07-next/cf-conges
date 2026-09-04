"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

export default function SoldeInitialBanner({
  dateEntreeInitiale = "",
}) {
  const router = useRouter();

  const [dateEntree, setDateEntree] = useState(
    dateEntreeInitiale
      ? new Date(dateEntreeInitiale)
          .toISOString()
          .split("T")[0]
      : ""
  );

  const [joursRestants, setJoursRestants] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");

    if (!dateEntree) {
      setError(
        "Merci d'indiquer votre date d'entrée dans l'entreprise."
      );
      return;
    }

    if (
      joursRestants === "" ||
      Number(joursRestants) < 0
    ) {
      setError(
        "Merci d'indiquer votre solde actuel de congés payés."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * 1. Enregistrement de la date d'entrée
       */
      const userResponse = await fetch(
        "/api/profil/date-entree",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateEntree,
          }),
        }
      );

      let userData = {};

      try {
        userData = await userResponse.json();
      } catch {
        userData = {};
      }

      if (!userResponse.ok) {
        setError(
          userData.error ||
            "Impossible d'enregistrer la date d'entrée."
        );
        return;
      }

      /*
       * 2. Enregistrement du solde CP
       */
      const soldeResponse = await fetch(
        "/api/profil/solde-initial",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            joursRestants: Number(joursRestants),
          }),
        }
      );

      let soldeData = {};

      try {
        soldeData = await soldeResponse.json();
      } catch {
        soldeData = {};
      }

      if (!soldeResponse.ok) {
        setError(
          soldeData.error ||
            "Impossible d'enregistrer votre solde de congés."
        );
        return;
      }

      setDone(true);

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur première configuration :",
        error
      );

      setError(
        "Impossible de contacter le serveur. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return null;
  }

  return (
    <Card className="p-5 mb-6 border-brand-yellow/50 bg-brand-yellow/5">
      <div className="flex items-start gap-3">
        <div className="text-2xl">
          👋
        </div>

        <div className="flex-1">
          <p className="font-bold text-brand-dark text-base mb-1">
            Configurez votre compte
          </p>

          <p className="text-sm text-brand-dark/70 mb-4">
            Pour calculer correctement votre solde de
            congés payés, renseignez les informations
            indiquées sur votre fiche de paie.
          </p>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* DATE D'ENTRÉE */}
            <div>
              <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">
                Date d'entrée dans l'entreprise
              </label>

              <input
                type="date"
                required
                value={dateEntree}
                onChange={(e) =>
                  setDateEntree(e.target.value)
                }
                disabled={loading}
                className="w-full sm:w-64 px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus-ring outline-none"
              />

              <p className="text-[11px] text-brand-dark/50 mt-1">
                Cette date permet de calculer automatiquement
                vos acquisitions mensuelles de CP.
              </p>
            </div>

            {/* SOLDE CP */}
            <div>
              <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">
                Solde actuel de congés payés
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={joursRestants}
                  onChange={(e) =>
                    setJoursRestants(e.target.value)
                  }
                  disabled={loading}
                  placeholder="ex : 2,5"
                  className="w-32 px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus-ring outline-none"
                />

                <span className="text-sm text-brand-dark/60">
                  jours
                </span>
              </div>

              <p className="text-[11px] text-brand-dark/50 mt-1">
                Indiquez le nombre de jours de CP restants
                affiché sur votre dernière fiche de paie.
              </p>
            </div>

            {error && (
              <p className="text-xs text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Enregistrement…"
                  : "Enregistrer ma configuration"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Card>
  );
}
