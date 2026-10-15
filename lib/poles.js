// Pôles de CF Réseaux, et couleur discrète associée à chacun (trait de
// repère dans le planning équipe, filtre des tickets restaurant).
export const POLES = ["Communication", "Formateurs", "Direction", "Administration", "Bureau d’études"];

export const COULEURS_POLES = {
  Communication: "#E8863C",
  Formateurs: "#4C8DBF",
  Direction: "#9B7FD1",
  Administration: "#63B3C9",
  "Bureau d’études": "#D9A400",
};

export function couleurPole(pole) {
  return COULEURS_POLES[pole] || null;
}
