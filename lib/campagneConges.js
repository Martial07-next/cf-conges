export const JOURS_PAR_MOIS = 2.5;
export const PLAFOND_ANNUEL = 30;

export function arrondi2(x) {
  return Math.round(x * 100) / 100;
}

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
  return joursAcquisPourCampagne({
    campagneAnnee: periodeAnnee(dateReference),
    dateEntree,
    dateSortie: null,
    dateReference,
  });
}

    moisIter++;
    if (moisIter > 11) {
      moisIter = 0;
      anneeIter++;
    }
  }

  return arrondi2(Math.max(0, Math.min(PLAFOND_ANNUEL, total)));
}

/**
 * Version generalisee : calcule l'acquis pour UNE campagne precise (pas
 * forcement celle de "aujourd'hui"), en tenant compte d'une eventuelle
 * date de sortie et d'une liste de conges sans solde a exclure.
 */
export function joursAcquisPourCampagne({ campagneAnnee, dateEntree, dateSortie, dateReference, congesSansSolde = [] }) {
  const debutCampagne = new Date(campagneAnnee, 5, 1);
  const finCampagne = new Date(campagneAnnee + 1, 4, 31);
  const entree = new Date(dateEntree);
  const ref = dateReference ? new Date(dateReference) : new Date();

  if (entree > finCampagne) return 0;
  if (dateSortie && new Date(dateSortie) < debutCampagne) return 0;

  const debutEffectif = entree > debutCampagne ? entree : debutCampagne;
  let finEffective = finCampagne;
  if (dateSortie && new Date(dateSortie) < finEffective) finEffective = new Date(dateSortie);
  if (ref < finEffective) finEffective = ref;
  if (finEffective < debutEffectif) return 0;

  function estJourSansSolde(jour) {
    return congesSansSolde.some((c) => jour >= new Date(c.dateDebut) && jour <= new Date(c.dateFin));
  }

  let total = 0;
  let anneeIter = debutEffectif.getFullYear();
  let moisIter = debutEffectif.getMonth();
  const anneeFin = finEffective.getFullYear();
  const moisFin = finEffective.getMonth();

  while (anneeIter < anneeFin || (anneeIter === anneeFin && moisIter <= moisFin)) {
    const debutMois = new Date(anneeIter, moisIter, 1);
    const finMois = new Date(anneeIter, moisIter + 1, 0);
    const estPremierMois = anneeIter === debutEffectif.getFullYear() && moisIter === debutEffectif.getMonth();
    const estDernierMois = anneeIter === anneeFin && moisIter === moisFin;

    const debutDansCeMois = estPremierMois ? debutEffectif : debutMois;
    const finDansCeMois = estDernierMois ? finEffective : finMois;

    const joursOuvresMoisTotal = joursOuvresEntre(debutMois, finMois);
    let joursOuvresTravailles = 0;
    const curseur = new Date(debutDansCeMois);
    while (curseur <= finDansCeMois) {
      if (estJourOuvre(curseur) && !estJourSansSolde(curseur)) joursOuvresTravailles++;
      curseur.setDate(curseur.getDate() + 1);
    }

    if (joursOuvresMoisTotal > 0) {
      total += (joursOuvresTravailles / joursOuvresMoisTotal) * JOURS_PAR_MOIS;
    }

    moisIter++;{
    if (moisIter > 11) { moisIter = 0; anneeIter++;} 
  }

  return arrondi2(Math.max(0, Math.min(PLAFOND_ANNUEL, total)));
}
