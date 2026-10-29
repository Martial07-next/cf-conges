// Agenda libre des Employeurs / RH et du pôle Direction : statut de chaque
// demi-journée, pour que les salariés sachent quand ils sont joignables.

export const PERIODES = [
  { valeur: "MATIN", label: "Matin" },
  { valeur: "APREM", label: "Après-midi" },
];

// joignable : affiché aux salariés ("Joignable" / "Non joignable").
// avecLieu : propose un champ lieu (bâtiment, site, ville…).
export const STATUTS_AGENDA = {
  BUREAU: { label: "Au bureau", code: "B", couleur: "#16A34A", joignable: true, avecLieu: true },
  TELETRAVAIL: { label: "Télétravail", code: "TT", couleur: "#2563EB", joignable: true, avecLieu: false },
  DEPLACEMENT: { label: "En déplacement", code: "DÉP", couleur: "#9333EA", joignable: true, avecLieu: true },
  REUNION: { label: "En réunion", code: "RÉU", couleur: "#F97316", joignable: false, avecLieu: true },
  INDISPONIBLE: { label: "Indisponible", code: "IND", couleur: "#E11D48", joignable: false, avecLieu: false },
  ABSENT: { label: "Absent", code: "ABS", couleur: "#6B7280", joignable: false, avecLieu: false },
};

export function statutAgenda(statut) {
  return STATUTS_AGENDA[statut] || null;
}

// Qui tient un agenda libre : Employeur / RH, et toute personne du pôle Direction.
export function estDirection(user) {
  return user?.role === "EMPLOYEUR" || user?.pole === "Direction";
}

// Jour "AAAA-MM-JJ" d'une entrée d'agenda (enregistrée à minuit UTC).
export function jourAgendaISO(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Regroupe des entrées en { "<userId>_<AAAA-MM-JJ>": { MATIN, APREM } }.
export function indexerAgenda(entrees) {
  const index = new Map();
  for (const e of entrees) {
    const cle = `${e.userId}_${jourAgendaISO(e.date)}`;
    const jour = index.get(cle) || {};
    jour[e.periode] = { statut: e.statut, lieu: e.lieu || null, note: e.note || null };
    index.set(cle, jour);
  }
  return index;
}

// Texte court d'un créneau, ex. "Au bureau · Bâtiment A".
export function libelleCreneau(creneau) {
  const s = creneau && statutAgenda(creneau.statut);
  if (!s) return "Non renseigné";
  return creneau.lieu ? `${s.label} · ${creneau.lieu}` : s.label;
}
