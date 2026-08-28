import { prisma } from "./prisma";
import { estJourFerie } from "./joursFeries";

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

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function estBloquant(leaves, userId, jour) {
  return leaves.some((l) => l.userId === userId && jour >= l.dateDebut && jour <= l.dateFin && l.leaveType.retireTicketRestau);
}

// Un jour est "avant embauche" si la date d'entree du collaborateur est
// posterieure a ce jour-la (ou si aucune date d'entree n'est renseignee, on
// ne bloque rien pour eviter de masquer des donnees par erreur).
function estAvantEmbauche(u, jour) {
  return !!u.dateEntree && jour < new Date(u.dateEntree);
}

// Un jour est "apres depart" si la date de sortie du collaborateur est
// anterieure a ce jour-la.
function estApresDepart(u, jour) {
  return !!u.dateSortie && jour > new Date(u.dateSortie);
}

async function chargerFeriesTravailles(userIds, debut, fin) {
  const decisions = await prisma.jourFerieDecision.findMany({
    where: { userId: { in: userIds }, date: { gte: debut, lte: fin }, statut: "VALIDE", souhaiteTravailler: true },
    select: { userId: true, date: true },
  });
  return new Set(decisions.map((d) => `${d.userId}_${new Date(d.date).toDateString()}`));
}

function estFerieChome(jour, userId, feriesTravailles) {
  return !!estJourFerie(jour) && !feriesTravailles.has(`${userId}_${jour.toDateString()}`);
}

// Calcule, pour chaque utilisateur passé et chaque mois de l'annee donnee (0 =
// janvier ... 11 = decembre), le nombre de tickets restaurant cumules :
// (jours ouvres sans conge bloquant ce jour-la, hors avant embauche) moins
// (regularisations ce mois-la).
export async function calculerTicketsRestau(users, annee) {
  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59);
  const userIds = users.map((u) => u.id);

  const [leaves, regularisations, feriesTravailles] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId: { in: userIds }, statut: "VALIDE", dateDebut: { lte: fin }, dateFin: { gte: debut } },
      select: { userId: true, dateDebut: true, dateFin: true, leaveType: { select: { retireTicketRestau: true } } },
    }),
    prisma.ticketRestauRegularisation.findMany({
      where: { userId: { in: userIds }, date: { gte: debut, lte: fin } },
      select: { userId: true, date: true },
    }),
    chargerFeriesTravailles(userIds, debut, fin),
  ]);

  const resultats = {};
  for (const u of users) resultats[u.id] = Array(12).fill(0);

  const joursAnnee = Math.round((fin - debut) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < joursAnnee; i++) {
    const jour = new Date(annee, 0, 1 + i);
    if (isWeekend(jour)) continue;
    const mois = jour.getMonth();

    for (const u of users) {
      if (estAvantEmbauche(u, jour)) continue;
      if (estApresDepart(u, jour)) continue;
      if (estFerieChome(jour, u.id, feriesTravailles)) continue;
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

// Detail jour par jour (jours ouvres uniquement) pour un mois donne, pour un
// ou plusieurs utilisateurs. Chaque jour est classe en :
// - "avant_embauche"  : avant la date d'entree du collaborateur (aucun ticket)
// - "regularise"      : une regularisation existe ce jour-la (ticket retire manuellement)
// - "ferie"            : jour ferie chome par defaut (aucun ticket)
// - "ferie_travaille"  : jour ferie travaille et valide par l'employeur (ticket gagne)
// - "conge"            : un conge valide dont le type retire le ticket ce jour-la
// - "ticket"           : ticket normalement gagne
export async function calculerDetailTicketsRestauMois(users, annee, mois) {
  const debutMois = new Date(annee, mois, 1);
  const finMois = new Date(annee, mois + 1, 0, 23, 59, 59);
  const userIds = users.map((u) => u.id);

  const [leaves, regularisations, feriesTravailles] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId: { in: userIds }, statut: "VALIDE", dateDebut: { lte: finMois }, dateFin: { gte: debutMois } },
      select: { userId: true, dateDebut: true, dateFin: true, leaveType: true },
    }),
    prisma.ticketRestauRegularisation.findMany({
      where: { userId: { in: userIds }, date: { gte: debutMois, lte: finMois } },
      include: { createdBy: { select: { prenom: true, nom: true } } },
    }),
    chargerFeriesTravailles(userIds, debutMois, finMois),
  ]);

  const joursMois = finMois.getDate();
  const jours = [];
  for (let i = 1; i <= joursMois; i++) {
    const d = new Date(annee, mois, i);
    if (!isWeekend(d)) jours.push(d);
  }

  const semaines = [];
  for (const j of jours) {
    const lundi = startOfWeekMonday(j);
    const key = lundi.toDateString();
    let sem = semaines.find((s) => s.key === key);
    if (!sem) {
      sem = { key, debut: lundi, span: 0 };
      semaines.push(sem);
    }
    sem.span += 1;
  }
  const semainesLabels = semaines.map((s) => {
    const fin = new Date(s.debut);
    fin.setDate(fin.getDate() + 4);
    return { label: `${s.debut.getDate()}/${s.debut.getMonth() + 1} → ${fin.getDate()}/${fin.getMonth() + 1}`, span: s.span };
  });

  const regMap = new Map();
  for (const r of regularisations) {
    const key = new Date(r.date).toDateString();
    if (!regMap.has(r.userId)) regMap.set(r.userId, new Map());
    regMap.get(r.userId).set(key, r);
  }

  const details = {};
  for (const u of users) details[u.id] = {};

  for (const jour of jours) {
    const key = jour.toDateString();
    for (const u of users) {
      if (estAvantEmbauche(u, jour)) {
        details[u.id][key] = { etat: "avant_embauche" };
        continue;
      }
      if (estApresDepart(u, jour)) {
        details[u.id][key] = { etat: "apres_depart" };
        continue;
      }

      const reg = regMap.get(u.id)?.get(key);
      const ferie = estJourFerie(jour);
      const leave = leaves.find((l) => l.userId === u.id && jour >= l.dateDebut && jour <= l.dateFin);

      if (reg) {
        details[u.id][key] = {
          etat: "regularise",
          commentaire: reg.commentaire || "",
          dateISO: isoDate(jour),
          dateLabel: jour.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" }),
          createdByLabel: reg.createdBy ? `${reg.createdBy.prenom} ${reg.createdBy.nom}` : null,
        };
      } else if (ferie && !feriesTravailles.has(`${u.id}_${key}`)) {
        details[u.id][key] = { etat: "ferie", libelle: ferie.libelle };
      } else if (ferie) {
        details[u.id][key] = { etat: "ferie_travaille", libelle: ferie.libelle };
      } else if (leave && leave.leaveType.retireTicketRestau) {
        details[u.id][key] = { etat: "conge", leaveType: { code: leave.leaveType.code, couleur: leave.leaveType.couleur, libelle: leave.leaveType.libelle } };
      } else {
        details[u.id][key] = { etat: "ticket" };
      }
    }
  }

  return { jours, semainesLabels, details };
}

// Nombre de tickets restaurant d'un seul collaborateur, pour un mois donne
// (vue personnelle, ex. tableau de bord).
export async function calculerTicketsMoisUtilisateur(userId, annee, mois) {
  const utilisateur = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, dateEntree: true, dateSortie: true },
  });
  if (!utilisateur) return 0;

  const resultats = await calculerTicketsRestau([utilisateur], annee);
  return resultats[userId] ? resultats[userId][mois] : 0;
}
