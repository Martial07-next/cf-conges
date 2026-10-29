// Agenda des Employeurs / RH et du pôle Direction. Par défaut, la personne
// est présente : on ne saisit que les exceptions (comme une demande de
// congé), sur une ou plusieurs journées, ou une demi-journée.

export const PERIODES = [
  { valeur: "MATIN", label: "Matin" },
  { valeur: "APREM", label: "Après-midi" },
];

// joignable : affiché aux salariés ("Joignable" / "Non joignable").
// avecLieu : propose un champ lieu (bâtiment, site, ville…).
export const STATUTS_AGENDA = {
  TELETRAVAIL: { label: "Télétravail", code: "TT", couleur: "#2563EB", joignable: true, avecLieu: false },
  DEPLACEMENT: { label: "En déplacement", code: "DÉP", couleur: "#9333EA", joignable: true, avecLieu: true },
  REUNION: { label: "En réunion", code: "RÉU", couleur: "#F97316", joignable: false, avecLieu: true },
  INDISPONIBLE: { label: "Indisponible", code: "IND", couleur: "#E11D48", joignable: false, avecLieu: false },
  ABSENT: { label: "Absent", code: "ABS", couleur: "#6B7280", joignable: false, avecLieu: false },
  BUREAU: { label: "Sur un autre site", code: "SITE", couleur: "#16A34A", joignable: true, avecLieu: true },
};

// Demi-journée sans exception : la personne est là.
export const PRESENT = { label: "Présent", code: "B", couleur: "#16A34A", joignable: true };

export function statutAgenda(statut) {
  return STATUTS_AGENDA[statut] || null;
}

// Qui tient cet agenda : Employeur / RH, et toute personne du pôle Direction.
export function estDirection(user) {
  return user?.role === "EMPLOYEUR" || user?.pole === "Direction";
}

// Jour "AAAA-MM-JJ" d'une date enregistrée à minuit UTC.
export function jourISO(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Regroupe les exceptions par personne.
export function indexerEvenements(evenements) {
  const index = new Map();
  for (const e of evenements) {
    const liste = index.get(e.userId) || [];
    liste.push({ ...e, debutISO: jourISO(e.dateDebut), finISO: jourISO(e.dateFin) });
    index.set(e.userId, liste);
  }
  return index;
}

// Exceptions d'une personne pour un jour : { MATIN?, APREM? }, ou null si
// elle est simplement présente. La plus récente l'emporte en cas de chevauchement.
export function creneauxDuJour(index, userId, iso) {
  const liste = (index.get(userId) || []).filter((e) => e.debutISO <= iso && iso <= e.finISO);
  if (liste.length === 0) return null;
  liste.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const creneaux = {};
  for (const e of liste) {
    const valeur = { statut: e.statut, lieu: e.lieu || null, note: e.note || null };
    if (e.demiJournee && e.periode) creneaux[e.periode] = valeur;
    else {
      creneaux.MATIN = valeur;
      creneaux.APREM = valeur;
    }
  }
  return creneaux;
}

// Texte court d'une demi-journée, ex. "En déplacement · Lyon". Vide = présent.
export function libelleCreneau(creneau) {
  const s = creneau && statutAgenda(creneau.statut);
  if (!s) return PRESENT.label;
  return creneau.lieu ? `${s.label} · ${creneau.lieu}` : s.label;
}
