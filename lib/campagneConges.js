export const JOURS_PAR_MOIS = 2.5;
import { estJourFerie } from "./joursFeries";

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

// Compte les jours a deduire pour une absence : lundi -> vendredi,
// hors jours feries legaux francais.
export function joursAbsenceEntre(debut, fin) {
  if (fin < debut) return 0;
  let count = 0;
  const curseur = new Date(debut);
  while (curseur <= fin) {
    if (estJourOuvre(curseur) && !estJourFerie(curseur)) count++;
    curseur.setDate(curseur.getDate() + 1);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Congés payés : décompte en JOURS OUVRABLES (lundi → samedi), cohérent avec
// l'acquisition de 2,5 j par mois (30 j par an = 5 semaines de 6 jours).
//
// L'absence court du premier jour de congé jusqu'à la veille de la reprise
// (premier jour ouvré, lundi → vendredi hors férié, après la date de fin).
// Le samedi est décompté dès qu'il tombe dans cette absence :
//   - congé le vendredi, reprise le lundi → 2 j (vendredi + samedi) ;
//   - congé le lundi seul, reprise le mardi → 1 j (le samedi d'avant n'entre
//     pas dans l'absence) ;
//   - semaine complète du lundi au vendredi → 6 j ;
//   - samedi férié (chômé) → jamais décompté.
// Pas de plafond « 5 samedis » : ce n'est pas une règle du Code du travail.
// Une demi-journée vaut 0,5 j, sans samedi.
//
// La règle s'applique aux congés qui commencent à partir de cette date ; les
// congés plus anciens gardent leur décompte d'origine (lundi → vendredi) pour
// ne pas modifier rétroactivement des soldes déjà communiqués.
export const DEBUT_REGLE_SAMEDI = new Date(2026, 11, 1);

function lendemain(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

// Premier jour ouvré (lundi → vendredi, hors férié) après la date de fin.
export function dateReprise(fin) {
  let d = lendemain(fin);
  while (!estJourOuvre(d) || estJourFerie(d)) d = lendemain(d);
  return d;
}

// Dernier jour de l'absence (veille de la reprise).
export function finAbsenceCP(fin) {
  const d = dateReprise(fin);
  d.setDate(d.getDate() - 1);
  return d;
}

export function regleSamediApplicable(debut) {
  return new Date(debut) >= DEBUT_REGLE_SAMEDI;
}

// Détail du décompte CP : { jours, samedis: [Date], feries }. borne
// optionnelle { du, au } pour ne compter que les jours d'une campagne.
export function decompteCP(debut, fin, demiJournee = false, borne = null) {
  debut = new Date(debut);
  fin = new Date(fin);
  if (fin < debut) return { jours: 0, samedis: [] };
  const dansBorne = (d) => !borne || (d >= borne.du && d <= borne.au);
  const avecSamedi = !demiJournee && regleSamediApplicable(debut);
  const dernier = avecSamedi ? finAbsenceCP(fin) : fin;
  let ouvres = 0;
  const samedis = [];
  for (let d = new Date(debut); d <= dernier; d = lendemain(d)) {
    if (!dansBorne(d) || estJourFerie(d)) continue;
    if (d <= fin && estJourOuvre(d)) ouvres++;
    else if (avecSamedi && d.getDay() === 6) samedis.push(new Date(d));
  }
  const jours = demiJournee ? ouvres * 0.5 : ouvres + samedis.length;
  return { jours, samedis };
}

// Nombre de jours de CP décomptés pour une absence.
export function joursCPEntre(debut, fin, demiJournee = false, borne = null) {
  return decompteCP(debut, fin, demiJournee, borne).jours;
}

// Jours décomptés selon le type : CP en jours ouvrables (samedi compris),
// les autres types en jours ouvrés (lundi → vendredi).
export function joursDecomptes(codeType, debut, fin, demiJournee = false) {
  if (codeType === "CP") return joursCPEntre(debut, fin, demiJournee);
  return joursAbsenceEntre(new Date(debut), new Date(fin)) * (demiJournee ? 0.5 : 1);
}

// Jours fériés tombant un jour ouvré entre deux dates incluses : ils ne sont
// jamais décomptés d'une absence (affichés « non décomptés » à l'utilisateur).
export function feriesEnSemaineEntre(debut, fin) {
  const liste = [];
  const curseur = new Date(debut);
  while (curseur <= fin) {
    const ferie = estJourOuvre(curseur) && estJourFerie(curseur);
    if (ferie) liste.push({ date: new Date(curseur), libelle: ferie.libelle });
    curseur.setDate(curseur.getDate() + 1);
  }
  return liste;
}

// Compte les jours ouvres (lundi -> vendredi) entre deux dates incluses.
// Cette fonction reste volontairement independante des jours feries car elle
// sert aussi au prorata d'acquisition mensuel.
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
 * reference donnee (typiquement "aujourd'hui"). Delegue a la version
 * generalisee ci-dessous, sans date de sortie ni conges sans solde.
 */
export function joursAcquisDepuisDebutCampagne(dateReference, dateEntree) {
  return joursAcquisPourCampagne({
    campagneAnnee: periodeAnnee(dateReference),
    dateEntree,
    dateSortie: null,
    dateReference,
  });
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

    moisIter++;
    if (moisIter > 11) {
      moisIter = 0;
      anneeIter++;
    }
  }

  return arrondi2(Math.max(0, Math.min(PLAFOND_ANNUEL, total)));
}

// Filtre Prisma : personnes présentes dans l'entreprise sur une période
// (arrivées avant sa fin, et pas parties avant son début). Une personne sans
// date d'entrée n'est gardée que si inclureSansDate (campagne en cours), pour
// que l'administration voie qu'il manque cette date.
export function presentesSurPeriode(debut, fin, inclureSansDate = false) {
  return {
    AND: [
      { OR: [{ dateEntree: { lte: fin } }, ...(inclureSansDate ? [{ dateEntree: null }] : [])] },
      { OR: [{ dateSortie: null }, { dateSortie: { gte: debut } }] },
    ],
  };
}
