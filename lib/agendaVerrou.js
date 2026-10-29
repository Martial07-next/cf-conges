import { estJourFerie } from "./joursFeries";
import { dateFranceISO } from "./dateFrance";

// Jours de l'agenda Direction qui ne peuvent pas être modifiés :
// - "passe" : jour déjà passé ;
// - "ferie" : jour férié non travaillé. Un férié est travaillé si la
//   direction l'a ouvert au travail, ou si la personne a une demande de
//   jour férié travaillé acceptée.
// isos : liste de jours "AAAA-MM-JJ". Renvoie Map(iso -> { verrou, ferie }).
export async function etatJoursAgenda(prisma, userId, isos) {
  const aujourdHui = dateFranceISO();
  const feries = new Map();
  for (const iso of isos) {
    const [y, m, d] = iso.split("-").map(Number);
    const f = estJourFerie(new Date(y, m - 1, d));
    if (f) feries.set(iso, { libelle: f.libelle, date: new Date(y, m - 1, d) });
  }

  const datesFeries = [...feries.values()].map((f) => f.date);
  const [ouvertures, decisions] = datesFeries.length
    ? await Promise.all([
        prisma.jourFerieOuverture.findMany({ where: { date: { in: datesFeries }, ouvert: true }, select: { date: true } }),
        prisma.jourFerieDecision.findMany({
          where: { userId, date: { in: datesFeries }, statut: "VALIDE", souhaiteTravailler: true },
          select: { date: true },
        }),
      ])
    : [[], []];
  const travailles = new Set([...ouvertures, ...decisions].map((x) => new Date(x.date).getTime()));

  const etats = new Map();
  for (const iso of isos) {
    const f = feries.get(iso);
    const ferieTravaille = f ? travailles.has(f.date.getTime()) : false;
    let verrou = null;
    if (iso < aujourdHui) verrou = "passe";
    else if (f && !ferieTravaille) verrou = "ferie";
    etats.set(iso, { verrou, ferie: f ? f.libelle : null, ferieTravaille });
  }
  return etats;
}
