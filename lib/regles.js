// Delai minimum, en jours, avant le debut d'un conge, en dessous duquel il
// n'est plus possible de le modifier ou d'en demander l'annulation.
export const DELAI_MIN_JOURS = 21;

export function delaiRespecte(dateDebut) {
  const diffMs = new Date(dateDebut).getTime() - Date.now();
  const diffJours = diffMs / (1000 * 60 * 60 * 24);
  return diffJours >= DELAI_MIN_JOURS;
}

// Formate une periode : si dateDebut et dateFin sont le meme jour, n'affiche
// qu'une seule date au lieu de "Jour → Jour".
export function formatPeriode(dateDebut, dateFin) {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const format = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  if (debut.toDateString() === fin.toDateString()) {
    return format(debut);
  }
  return `${format(debut)} → ${format(fin)}`;
}
