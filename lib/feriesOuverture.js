import { joursFeries } from "./joursFeries";

// Jours fériés tombant en semaine entre deux dates (incluses) : les seuls
// pour lesquels la question "travailler ce jour-là ?" a un sens.
export function feriesEnSemaine(debut, fin) {
  const annees = [];
  for (let a = debut.getFullYear(); a <= fin.getFullYear(); a++) annees.push(a);
  return annees
    .flatMap((a) => joursFeries(a))
    .filter((f) => f.date >= debut && f.date <= fin && f.date.getDay() !== 0 && f.date.getDay() !== 6)
    .sort((a, b) => a.date - b.date);
}

export function isoJour(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
