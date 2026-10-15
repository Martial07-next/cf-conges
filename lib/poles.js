// Pôles de CF Réseaux, et couleur discrète associée à chacun (trait de
// repère dans le planning équipe, filtre des tickets restaurant).
export const POLES = ["Communication", "Formateurs", "Direction", "Administration", "Bureau d’études"];

// La Direction n'a pas de tickets restaurant : pas de filtre pour elle sur
// la page Gestionnaire TR.
export const POLES_TICKETS_RESTAU = POLES.filter((p) => p !== "Direction");

// Teintes volontairement très éloignées les unes des autres pour être
// distinguées d'un coup d'œil.
export const COULEURS_POLES = {
  Communication: "#F97316", // orange
  Formateurs: "#2563EB", // bleu
  Direction: "#9333EA", // violet
  Administration: "#E11D48", // rouge framboise
  "Bureau d’études": "#059669", // vert émeraude
};

export function couleurPole(pole) {
  return COULEURS_POLES[pole] || null;
}
