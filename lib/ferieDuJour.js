// Jour férié du jour (heure de Paris) et personnes qui le travaillent :
// sert au message quotidien, à l'« Équipe en direct » et au tableau de bord.
import { estJourFerie } from "./joursFeries";

const JOUR_MS = 86400000;

function dateLocale(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ferieLe(iso) {
  return estJourFerie(dateLocale(iso));
}

function estWeekendISO(iso) {
  const j = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return j === 0 || j === 6;
}

// Prochain jour ouvré après iso (ni week-end ni férié).
export function prochainJourOuvre(iso) {
  let t = new Date(`${iso}T12:00:00Z`).getTime() + JOUR_MS;
  for (let i = 0; i < 15; i++, t += JOUR_MS) {
    const j = new Date(t).toISOString().slice(0, 10);
    if (!estWeekendISO(j) && !ferieLe(j)) return j;
  }
  return null;
}

// « demain », « lundi », « lundi 14 avril »…
export function libelleRetour(iso, depuis) {
  if (!iso) return "bientôt";
  const ecart = Math.round((new Date(`${iso}T12:00:00Z`) - new Date(`${depuis}T12:00:00Z`)) / JOUR_MS);
  const jour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  if (ecart === 1) return "demain";
  if (ecart < 7) return jour;
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

// { ferie: { libelle } | null, travailleurs: Set(userId) } pour le jour iso.
// Les décisions « travailler le férié » sont enregistrées à minuit (heure du
// serveur) : on cherche dans une fenêtre de ±12 h autour de minuit UTC.
export async function ferieEtTravailleurs(prisma, iso) {
  const ferie = ferieLe(iso);
  if (!ferie || estWeekendISO(iso)) return { ferie: null, travailleurs: new Set() };
  const minuit = new Date(`${iso}T00:00:00.000Z`).getTime();
  const decisions = await prisma.jourFerieDecision.findMany({
    where: {
      date: { gte: new Date(minuit - JOUR_MS / 2), lt: new Date(minuit + JOUR_MS / 2) },
      statut: "VALIDE",
      souhaiteTravailler: true,
    },
    select: { userId: true },
  });
  return { ferie: { libelle: ferie.libelle }, travailleurs: new Set(decisions.map((d) => d.userId)) };
}
