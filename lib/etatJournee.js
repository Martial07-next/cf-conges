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
    : { type: "ferie", code: "F", label: "Férié", detail: libelle, couleur: "#94A3B8", joignable: false };
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

export function memeEtat(a, b) {
  return !!a && !!b && a.type === b.type && a.code === b.code && a.label === b.label && (a.lieu || null) === (b.lieu || null) && (a.note || null) === (b.note || null);
}

// Couleurs d'une case : pleine pour ce qui sort de l'ordinaire (congé,
// télétravail, agenda), discrète pour une présence au bureau ou un férié.
export function apparenceEtat(etat) {
  if (!etat) return { className: "", style: undefined };
  if (etat.type === "bureau") return { className: "bg-brand-green/15 text-[#15803D] dark:text-brand-green", style: undefined };
  if (etat.type === "ferie") return { className: "bg-black/5 text-brand-dark/45", style: undefined };
  if (etat.type === "ferie_travaille") return { className: "text-[#422006]", style: { backgroundColor: etat.couleur } };
  return { className: "text-white", style: { backgroundColor: etat.couleur } };
}

// Catégorie d'une personne sur la journée (compteurs de la vue Jour).
export function categorieJournee(matin, aprem) {
  const types = [matin?.type, aprem?.type];
  if (types.includes("conge") || [matin?.code, aprem?.code].includes(STATUTS_AGENDA.ABSENT.code)) return "absent";
  if (types.includes("agenda")) return "dehors";
  if (types.includes("teletravail")) return "teletravail";
  if (types.includes("ferie")) return "ferie";
  return "bureau";
}
