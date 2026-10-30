// État d'une demi-journée dans le planning équipe (case, ligne du jour et
// détail de la journée). Objet simple, transmis tel quel aux composants client.
import { statutAgenda, STATUTS_AGENDA } from "./agendaDirection";

export const COULEUR_TELETRAVAIL = STATUTS_AGENDA.TELETRAVAIL.couleur; // bleu TT, le même pour tous
export const COULEUR_BUREAU = "#16A34A";

export const HORAIRES = { MATIN: "8h – 12h", APREM: "13h – 16h", JOURNEE: "8h – 16h" };

export const ETAT_BUREAU = { type: "bureau", code: "B", label: "Au bureau", detail: "Présence sur site", couleur: COULEUR_BUREAU, joignable: true };

export function etatTeletravail() {
  return { type: "teletravail", code: "TT", label: "Télétravail", detail: "À distance", couleur: COULEUR_TELETRAVAIL, joignable: true };
}

export function etatFerie(libelle, travaille = false) {
  return travaille
    ? { type: "ferie_travaille", code: "FT", label: "Férié travaillé", detail: libelle, couleur: "#EAB308", joignable: true }
    : { type: "ferie", code: "JF", label: "Férié", detail: libelle, couleur: "#94A3B8", joignable: false };
}

// Congé validé (le télétravail posé en demande est affiché comme tel).
export function etatDemande(leaveType) {
  if (leaveType?.code === "TT") return etatTeletravail();
  return {
    type: "conge",
    code: leaveType?.code || "A",
    label: leaveType?.libelle || "Absence",
    detail: "Absence validée",
    couleur: leaveType?.couleur || "#64748B",
    joignable: false,
  };
}

// Demi-journée de l'agenda Direction (sans exception : présent).
export function etatAgenda(creneau) {
  const s = creneau && statutAgenda(creneau.statut);
  if (!s) return ETAT_BUREAU;
  return {
    type: s === STATUTS_AGENDA.TELETRAVAIL ? "teletravail" : "agenda",
    code: s.code,
    label: s.label,
    detail: "Agenda Direction",
    couleur: s.couleur,
    joignable: s.joignable,
    lieu: creneau.lieu || null,
    note: creneau.note || null,
  };
}

// Formateur qui anime une ou plusieurs formations (planning CF Formations).
// formations : [{ formation, debut, fin, salle, lien }]
export const COULEUR_FORMATION = "#0afe6b";
export function etatFormation(formations) {
  const intitules = [...new Set(formations.map((f) => f.formation))];
  return {
    type: "formation",
    code: "F",
    label: "En formation",
    detail: intitules.join(" · "),
    couleur: COULEUR_FORMATION,
    lieu: [...new Set(formations.map((f) => f.salle).filter(Boolean))].join(", ") || null,
    formations,
  };
}

// Formations qui occupent une demi-journée (8h-12h ou 13h-16h).
const BORNES = { MATIN: ["08:00", "12:00"], APREM: ["13:00", "16:00"] };
export function formationsSurPeriode(formations, periode) {
  const [debut, fin] = BORNES[periode];
  return (formations || []).filter((f) => (f.debut || "00:00") < fin && (f.fin || "23:59") > debut);
}

export function memeEtat(a, b) {
  return (
    !!a &&
    !!b &&
    a.type === b.type &&
    a.code === b.code &&
    a.label === b.label &&
    (a.detail || null) === (b.detail || null) &&
    (a.lieu || null) === (b.lieu || null) &&
    (a.note || null) === (b.note || null)
  );
}

// Couleurs d'une case : pleine pour ce qui sort de l'ordinaire (congé,
// télétravail, agenda), discrète pour une présence au bureau ou un férié.
export function apparenceEtat(etat) {
  if (!etat) return { className: "", style: undefined };
  if (etat.type === "bureau") return { className: "bg-brand-green/15 text-[#15803D] dark:text-brand-green", style: undefined };
  if (etat.type === "ferie") return { className: "bg-black/5 text-brand-dark/45", style: undefined };
  // Même repère que l'« Équipe en direct » : vert CF sur fond sombre.
  if (etat.type === "formation") return { className: "bg-[#0E1712] text-[#0afe6b] dark:bg-[#0afe6b] dark:text-[#0E1712]", style: undefined };
  if (etat.type === "ferie_travaille") return { className: "text-[#422006]", style: { backgroundColor: etat.couleur } };
  return { className: "text-white", style: { backgroundColor: etat.couleur } };
}

// Catégorie d'une personne sur la journée (compteurs de la vue Jour).
export function categorieJournee(matin, aprem) {
  const types = [matin?.type, aprem?.type];
  if (types.includes("conge") || [matin?.code, aprem?.code].includes(STATUTS_AGENDA.ABSENT.code)) return "absent";
  if (types.includes("formation")) return "formation";
  if (types.includes("agenda")) return "dehors";
  if (types.includes("teletravail")) return "teletravail";
  if (types.includes("ferie")) return "ferie";
  return "bureau";
}
