export const TIME_ZONE = "Europe/Paris";

export function dateFranceISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
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
