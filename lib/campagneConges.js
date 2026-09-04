export const JOURS_PAR_MOIS = 2.5;
export const PLAFOND_ANNUEL = 30;

/**
 * Campagne de congés : juin -> mai.
 * Juin 2026 -> Mai 2027 = campagne 2026.
 */
export function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 6 ? y : y - 1;
}

export function estJourOuvre(date) {
  const jour = date.getDay();
  return jour !== 0 && jour !== 6;
}

// Compte les jours ouvres (lundi -> vendredi) entre deux dates incluses.
export function joursOuvresEntre(debut, fin) {
  if (fin < debut) return 0;
  let count = 0;
  const curseur = new Date(debut);
  while (curseur <= fin) {
    if (estJourOuvre(curseur)) count++;
    curseur.setDate(curseur.getDate() + 1);
  }
  return count;
}

/**
 * Jours acquis cumules depuis le debut de la campagne jusqu'a une date de
 * reference donnee (typiquement "aujourd'hui"). Chaque mois complet vaut
 * 2.5 jours ; le mois d'arrivee (si en cours de campagne) est proratise au
 * jour ouvre pres. Le mois en cours (celui de la date de reference) compte
 * pour un mois entier, comme le fait le cron mensuel qui credite des le 1er.
 */
export function joursAcquisDepuisDebutCampagne(dateReference, dateEntree) {
  const campagne = periodeAnnee(dateReference);
  const debutCampagne = new Date(campagne, 5, 1);
  const entree = new Date(dateEntree);

  if (entree > dateReference) return 0;

  const debutEffectif = entree > debutCampagne ? entree : debutCampagne;

  let total = 0;
  let anneeIter = debutEffectif.getFullYear();
  let moisIter = debutEffectif.getMonth();

  const anneeFin = dateReference.getFullYear();
  const moisFin = dateReference.getMonth();

  while (anneeIter < anneeFin || (anneeIter === anneeFin && moisIter <= moisFin)) {
    const debutMois = new Date(anneeIter, moisIter, 1);
    const finMois = new Date(anneeIter, moisIter + 1, 0);

    const estMoisArrivee = anneeIter === debutEffectif.getFullYear() && moisIter === debutEffectif.getMonth();
    const debutDansCeMois = estMoisArrivee ? debutEffectif : debutMois;

    const joursOuvresMoisTotal = joursOuvresEntre(debutMois, finMois);
    const joursOuvresTravailles = joursOuvresEntre(debutDansCeMois, finMois);

    if (joursOuvresMoisTotal > 0) {
      total += (joursOuvresTravailles / joursOuvresMoisTotal) * JOURS_PAR_MOIS;
    }

    moisIter++;
    if (moisIter > 11) {
      moisIter = 0;
      anneeIter++;
    }
  }

  return Math.max(0, Math.min(PLAFOND_ANNUEL, total));
}
