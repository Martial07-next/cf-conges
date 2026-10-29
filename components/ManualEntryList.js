"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState } from "./ui";
import { TypeBadge } from "./Badges";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function memeJour(a, b) {
  const debut = new Date(a);
  const fin = new Date(b);
  return debut.getFullYear() === fin.getFullYear()
    && debut.getMonth() === fin.getMonth()
    && debut.getDate() === fin.getDate();
}

function formatPeriodeEntree(r) {
  const periode = memeJour(r.dateDebut, r.dateFin)
    ? formatDate(r.dateDebut)
    : `${formatDate(r.dateDebut)} → ${formatDate(r.dateFin)}`;
  if (!r.demiJournee) return periode;
  const moment = r.demiJourneePeriode === "MATIN"
    ? " matin"
    : r.demiJourneePeriode === "APREM"
      ? " après-midi"
      : "";
  return `${periode} (demi-journée${moment})`;
}

// currentUserId (Employeur / RH) : seuls les congés qu'il a lui-même acceptés
// peuvent être supprimés.
export default function ManualEntryList({ entries, restrictPastDeletion = false, currentUserId = null }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(null);

  function estPasse(dateDebut) {
    const debut = new Date(dateDebut);
    const aujourdHui = new Date();
    debut.setHours(0, 0, 0, 0);
    aujourdHui.setHours(0, 0, 0, 0);
    return debut < aujourdHui;
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette entrée ? Le solde du collaborateur sera recrédité en conséquence.")) return;
    setDeleting(id);
    const res = await fetch(`/api/leave-entries/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) router.refresh();
  }

  return (
    <Card>
      {entries.length === 0 ? (
        <EmptyState title="Aucun congé ajouté manuellement" subtitle="Les entrées que vous ajoutez ci-dessus apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-black/5">
          {entries.map((r) => {
            const parUnAutre = !!currentUserId && !!r.valideParId && r.valideParId !== currentUserId;
            const suppressionBloquee = (restrictPastDeletion && estPasse(r.dateDebut)) || parUnAutre;
            const nomValideur = r.valideur ? `${r.valideur.prenom} ${r.valideur.nom}` : null;
            return (
            <li key={r.id} className="px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <TypeBadge leaveType={r.leaveType} />
                <div className="min-w-0">
                  <p className="text-sm text-brand-dark">
                    {r.user.prenom} {r.user.nom}
                    <span className="text-brand-dark/50">
                      {" "}
                      {formatPeriodeEntree(r)}
                    </span>
                  </p>
                  {r.motif && <p className="text-xs text-brand-dark/50">{r.motif}</p>}
                  {nomValideur && (
                    <p className="text-[11px] text-brand-dark/40">
                      Ajouté par {nomValideur}
                      {r.dateValidation ? ` le ${formatDate(r.dateValidation)}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id || suppressionBloquee}
                title={
                  parUnAutre
                    ? `Accepté par ${nomValideur || "un autre valideur"} : vous ne pouvez pas le supprimer.`
                    : suppressionBloquee
                      ? "Les entrées déjà passées ne peuvent pas être supprimées par un compte Employeur / RH."
                      : "Supprimer cette entrée"
                }
                className="text-xs font-semibold text-alert-soft hover:underline shrink-0 disabled:cursor-not-allowed disabled:opacity-35 disabled:no-underline"
              >
                {deleting === r.id ? "…" : parUnAutre ? "🔒 Autre valideur" : suppressionBloquee ? "Passé" : "Supprimer"}
              </button>
            </li>
          );})}
        </ul>
      )}
    </Card>
  );
}
