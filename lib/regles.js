// Delai minimum, en jours, avant le debut d'un conge, en dessous duquel il
// n'est plus possible de le modifier ou d'en demander l'annulation.
export const DELAI_MIN_JOURS = 21;

export function delaiRespecte(dateDebut) {
  const diffMs = new Date(dateDebut).getTime() - Date.now();
  const diffJours = diffMs / (1000 * 60 * 60 * 24);
  return diffJours >= DELAI_MIN_JOURS;
}
