import { prisma } from "./prisma";

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function startOfWeekMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const s = new Date(d);
  s.setDate(s.getDate() + diff);
  return s;
}

// Un congé validé ne retire un ticket que si son type a retireTicketRestau = true.
function estBloquant(leaves, userId, jour) {
  return leaves.some((l) => l.userId === userId && jour >= l.dateDebut && jour <= l.dateFin && l.leaveType.retireTicketRestau);
}

// Calcule, pour chaque utilisateur passé et chaque mois de l'annee donnee (0 =
// janvier ... 11 = decembre), le nombre de tickets restaurant cumules :
// (jours ouvres sans conge bloquant ce jour-la) moins (regularisations ce mois-la).
export async function calculerTicketsRestau(users, annee) {
  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59);
  const userIds = users.map((u) => u.id);

  const [leaves, regularisations] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId: { in: userIds }, statut: "VALIDE", dateDebut: { lte: fin }, dateFin: { gte: debut } },
      select: { userId: true, dateDebut: true, dateFin: true, leaveType: { select: { retireTicketRestau: true } } },
    }),
    prisma.ticketRestauRegularisation.findMany({
      where: { userId: { in: userIds }, date: { gte: debut, lte: fin } },
      select: { userId: true, date: true },
    }),
  ]);

  const resultats = {};
  for (const u of users) resultats[u.id] = Array(12).fill(0);

  const joursAnnee = Math.round((fin - debut) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < joursAnnee; i++) {
    const jour = new Date(annee, 0, 1 + i);
    if (isWeekend(jour)) continue;
    const mois = jour.getMonth();

    for (const u of users) {
      if (estBloquant(leaves, u.id, jour)) continue;
      resultats[u.id][mois] += 1;
    }
  }

  for (const r of regularisations) {
    const mois = new Date(r.date).getMonth();
    if (resultats[r.userId]) resultats[r.userId][mois] -= 1;
  }

  return resultats;
}

// Meme logique que ci-dessus, mais decoupee par semaine (lundi-dimanche) pour
// un mois donne. Retourne { resultats: { [userId]: [semaine1, semaine2, ...] },
// labels: ["12/05 → 18/05", ...] }.
export async function calculerTicketsRestauSemaines(users, annee, mois) {
  const debutMois = new Date(annee, mois, 1);
  const finMois = new Date(annee, mois + 1, 0, 23, 59, 59);
  const userIds = users.map((u) => u.id);

  const [leaves, regularisations] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId: { in: userIds }, statut: "VALIDE", dateDebut: { lte: finMois }, dateFin: { gte: debutMois } },
      select: { userId: true, dateDebut: true, dateFin: true, leaveType: { select: { retireTicketRestau: true } } },
    }),
    prisma.ticketRestauRegularisation.findMany({
      where: { userId: { in: userIds }, date: { gte: debutMois, lte: finMois } },
      select: { userId: true, date: true },
    }),
  ]);

  const semaines = [];
  let curseur = startOfWeekMonday(debutMois);
  while (curseur <= finMois) {
    semaines.push(new Date(curseur));
    curseur = new Date(curseur);
    curseur.setDate(curseur.getDate() + 7);
  }

  function semaineIndexPour(jour) {
    return semaines.findIndex((s) => {
      const finSemaine = new Date(s);
      finSemaine.setDate(finSemaine.getDate() + 6);
      finSemaine.setHours(23, 59, 59);
      return jour >= s && jour <= finSemaine;
    });
  }

  const resultats = {};
  for (const u of users) resultats[u.id] = Array(semaines.length).fill(0);

  const joursMois = finMois.getDate();
  for (let i = 1; i <= joursMois; i++) {
    const jour = new Date(annee, mois, i);
    if (isWeekend(jour)) continue;
    const idx = semaineIndexPour(jour);
    if (idx < 0) continue;

    for (const u of users) {
      if (estBloquant(leaves, u.id, jour)) continue;
      resultats[u.id][idx] += 1;
    }
  }

  for (const r of regularisations) {
    const idx = semaineIndexPour(new Date(r.date));
    if (idx >= 0 && resultats[r.userId]) resultats[r.userId][idx] -= 1;
  }

  const labels = semaines.map((s) => {
    const finSemaine = new Date(s);
    finSemaine.setDate(finSemaine.getDate() + 6);
    return `${s.getDate()}/${s.getMonth() + 1} → ${finSemaine.getDate()}/${finSemaine.getMonth() + 1}`;
  });

  return { resultats, labels };
}

// Nombre de tickets restaurant d'un seul collaborateur, pour un mois donne
// (vue personnelle, ex. tableau de bord).
export async function calculerTicketsMoisUtilisateur(userId, annee, mois) {
  const users = [{ id: userId }];
  const resultats = await calculerTicketsRestau(users, annee);
  return resultats[userId] ? resultats[userId][mois] : 0;
}
