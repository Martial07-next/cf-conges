function datePaques(annee) {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}

function addJours(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Jours feries legaux francais pour une annee donnee (dates fixes + jours
// mobiles bases sur Paques). Calcules automatiquement, aucune saisie manuelle
// necessaire.
export function joursFeries(annee) {
  const paques = datePaques(annee);
  return [
    { date: new Date(annee, 0, 1), libelle: "Jour de l'an" },
    { date: addJours(paques, 1), libelle: "Lundi de Pâques" },
    { date: new Date(annee, 4, 1), libelle: "Fête du Travail" },
    { date: new Date(annee, 4, 8), libelle: "Victoire 1945" },
    { date: addJours(paques, 39), libelle: "Ascension" },
    { date: addJours(paques, 50), libelle: "Lundi de Pentecôte" },
    { date: new Date(annee, 6, 14), libelle: "Fête Nationale" },
    { date: new Date(annee, 7, 15), libelle: "Assomption" },
    { date: new Date(annee, 10, 1), libelle: "Toussaint" },
    { date: new Date(annee, 10, 11), libelle: "Armistice" },
    { date: new Date(annee, 11, 25), libelle: "Noël" },
  ];
}

// Renvoie { date, libelle } si la date donnee est un jour ferie, sinon null.
export function estJourFerie(date) {
  const feries = joursFeries(date.getFullYear());
  return feries.find((f) => f.date.toDateString() === date.toDateString()) || null;
}
