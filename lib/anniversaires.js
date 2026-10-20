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
