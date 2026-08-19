import { prisma } from "./prisma";

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Calcule, pour chaque utilisateur passé et chaque mois de l'annee donnee (0 =
// janvier ... 11 = decembre), le nombre de tickets restaurant cumules :
// (jours ouvres sans conge valide ce jour-la) moins (regularisations ce mois-la).
export async function calculerTicketsRestau(users, annee) {
  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59);
  const userIds = users.map((u) => u.id);

  const [leaves, regularisations] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: userIds },
        statut: "VALIDE",
        dateDebut: { lte: fin },
        dateFin: { gte: debut },
      },
      select: { userId: true, dateDebut: true, dateFin: true },
    }),
    prisma.ticketRestauRegularisation.findMany({
      where: { userId: { in: userIds }, date: { gte: debut, lte: fin } },
      select: { userId: true, date: true },
    }),
  ]);

  // resultats[userId] = tableau de 12 compteurs (index 0 = janvier)
  const resultats = {};
  for (const u of users) resultats[u.id] = Array(12).fill(0);

  const joursAnnee = Math.round((fin - debut) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < joursAnnee; i++) {
    const jour = new Date(annee, 0, 1 + i);
    if (isWeekend(jour)) continue;
    const mois = jour.getMonth();

    for (const u of users) {
      const enConge = leaves.some((l) => l.userId === u.id && jour >= l.dateDebut && jour <= l.dateFin);
      if (enConge) continue;
      resultats[u.id][mois] += 1;
    }
  }

  for (const r of regularisations) {
    const mois = new Date(r.date).getMonth();
    if (resultats[r.userId]) resultats[r.userId][mois] -= 1;
  }

  return resultats;
}
