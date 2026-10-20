import { Card, EmptyState } from "@/components/ui";
import JourFerieValidationActions from "@/components/JourFerieValidationActions";
import { estJourFerie } from "@/lib/joursFeries";

// Demandes de travailler un jour férié (pop-up du tableau de bord), à
// accepter ou refuser par l'Employeur / RH, l'admin ou le cadre du pôle.
export default function JoursFeriesAValider({ decisions }) {
  return (
    <Card className="mb-8">
      <div className="px-6 py-5 border-b border-black/5">
        <h2 className="font-bold text-brand-dark">Jours fériés travaillés à valider</h2>
        <p className="text-xs text-brand-dark/50 mt-0.5">Collaborateurs qui souhaitent travailler un jour férié.</p>
      </div>
      {decisions.length === 0 ? (
        <EmptyState title="Aucune demande" subtitle="Rien à traiter pour l'instant." />
      ) : (
        <ul className="divide-y divide-black/5">
          {decisions.map((d) => {
            const date = new Date(d.date);
            const ferie = estJourFerie(date);
            return (
              <li key={d.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-dark">
                    {d.user.prenom} {d.user.nom}
                  </p>
                  <p className="text-xs text-brand-dark/50 mt-1">
                    Souhaite travailler le {date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                    {ferie?.libelle ? ` (${ferie.libelle})` : ""}
                  </p>
                </div>
                <JourFerieValidationActions decisionId={d.id} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
