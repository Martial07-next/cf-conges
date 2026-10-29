export const TIME_ZONE = "Europe/Paris";

// Formateur créé une seule fois : en créer un à chaque appel coûte ~30 fois
// plus cher, ce qui ralentissait nettement le planning (des milliers d'appels).
const FORMAT_JOUR = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "AAAA-MM-JJ" du jour à Paris.
export function dateFranceISO(date = new Date()) {
  return FORMAT_JOUR.format(date);
}

export function dateFranceDepuisISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error("Date invalide.");
  }

  return new Date(`${iso}T00:00:00.000Z`);
}

export function jourFrance(date = new Date()) {
  const iso = dateFranceISO(date);
  const debut = dateFranceDepuisISO(iso);
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 1);

  const jours = [
    "DIMANCHE",
    "LUNDI",
    "MARDI",
    "MERCREDI",
    "JEUDI",
    "VENDREDI",
    "SAMEDI",
  ];

  return {
    iso,
    debut,
    fin,
    codeJour: jours[debut.getUTCDay()],
  };
}
