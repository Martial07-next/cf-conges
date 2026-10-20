// Outils anniversaires. Les dates de naissance sont enregistrées à minuit
// UTC (saisie "AAAA-MM-JJ") : on compare donc jour et mois en UTC.
export function jourMoisNaissance(dateNaissance) {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  return { jour: d.getUTCDate(), mois: d.getUTCMonth() };
}

// dateISO : "AAAA-MM-JJ" (jour à tester, ex. aujourd'hui à Paris).
export function estAnniversaireLe(dateNaissance, dateISO) {
  const jm = jourMoisNaissance(dateNaissance);
  if (!jm) return false;
  const [, m, j] = dateISO.split("-").map(Number);
  return jm.jour === j && jm.mois === m - 1;
}

// Vrai si l'anniversaire tombe entre debut et fin (dates locales, bornes incluses).
export function anniversaireDansPeriode(dateNaissance, debut, fin) {
  const jm = jourMoisNaissance(dateNaissance);
  if (!jm) return false;
  for (let annee = debut.getFullYear(); annee <= fin.getFullYear(); annee++) {
    const jourAnniv = new Date(annee, jm.mois, jm.jour);
    if (jourAnniv.getMonth() !== jm.mois) continue; // 29 février une année non bissextile
    if (jourAnniv >= new Date(debut.getFullYear(), debut.getMonth(), debut.getDate()) && jourAnniv <= fin) return true;
  }
  return false;
}

export function libelleAnniversaire(dateNaissance) {
  const jm = jourMoisNaissance(dateNaissance);
  if (!jm) return "";
  return `Anniversaire le ${String(jm.jour).padStart(2, "0")}/${String(jm.mois + 1).padStart(2, "0")}`;
}
