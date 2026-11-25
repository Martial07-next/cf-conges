import { periodeAnnee, joursCPEntre, finAbsenceCP, joursAcquisPourCampagne, arrondi2, DEBUT_REGLE_SAMEDI } from "./campagneConges";

// Marge pour retrouver les CP qui finissent juste avant une campagne mais dont
// le samedi (veille de reprise) tombe dedans.
const MARGE_SAMEDI_MS = 7 * 86400000;

const multipleDemiJour = (x) => Math.abs(x * 2 - Math.round(x * 2)) < 1e-6;
const demiJourInferieur = (x) => Math.floor(x * 2 + 1e-6) / 2;

async function calculerCampagne(prisma, userId, campagneAnnee, user, dateReference, donnees = null) {
  const debutCampagne = new Date(campagneAnnee, 5, 1);
  const finCampagne = new Date(campagneAnnee + 1, 4, 31, 23, 59, 59);

  const cp = donnees?.cp ?? await prisma.leaveType.findUnique({ where: { code: "CP" } });

  const congesSansSolde = donnees
    ? donnees.congesSansSolde.filter((r) => r.dateDebut <= finCampagne && r.dateFin >= debutCampagne)
    : await prisma.leaveRequest.findMany({
        where: { userId, statut: "VALIDE", leaveType: { code: "C" }, dateDebut: { lte: finCampagne }, dateFin: { gte: debutCampagne } },
      });

  const acquisExact = joursAcquisPourCampagne({
    campagneAnnee,
    dateEntree: user.dateEntree,
    dateSortie: user.dateSortie,
    dateReference,
    congesSansSolde,
  });
  // Campagne terminée (après le 31 mai) : le total acquis est arrondi au
  // nombre entier supérieur (Code du travail, art. L3141-7), pour ne pas
  // garder de décimales (arrivée en cours d'année, mois incomplets…).
  // Pendant la campagne, le compteur reste précis au centième. La campagne
  // est terminée dès sa dernière seconde (31 mai 23:59:59) : c'est la date de
  // référence utilisée pour consulter une campagne passée (espace comptable,
  // exports).
  const campagneTerminee = new Date(dateReference) >= finCampagne;
  const acquis = campagneTerminee ? Math.ceil(arrondi2(acquisExact) - 1e-9) : acquisExact;

  const details = [];
  let pris = 0;
  // Jours imputés ici par des congés de la campagne SUIVANTE (reliquat N-1).
  let prisSuivante = 0;
  let imputesSuivante = [];

  if (cp) {
    // 1) Demandes dont la date tombe DANS cette campagne (cas normal)
    // Décompte en jours ouvrables (samedi compris, cf. decompteCP) : l'absence
    // court jusqu'à la veille de la reprise, d'où finAbsenceCP.
    const cpDatees = (donnees
      ? donnees.cpDemandes.filter((r) => r.dateDebut <= finCampagne && r.dateFin >= new Date(debutCampagne.getTime() - MARGE_SAMEDI_MS))
      : await prisma.leaveRequest.findMany({
          where: { userId, statut: "VALIDE", leaveTypeId: cp.id, dateDebut: { lte: finCampagne }, dateFin: { gte: new Date(debutCampagne.getTime() - MARGE_SAMEDI_MS) } },
        })
    ).filter((r) => finAbsenceCP(r.dateFin) >= debutCampagne);
    for (const r of cpDatees) {
      const joursTotal = joursCPEntre(r.dateDebut, r.dateFin, r.demiJournee, { du: debutCampagne, au: finCampagne });
      const joursSurCetteCampagne = Math.max(0, joursTotal - (r.joursPrisSurN1 || 0));
      pris += joursSurCetteCampagne;
      details.push({ type: "consommation", montant: -arrondi2(joursSurCetteCampagne), requestId: r.id, dateDebut: r.dateDebut, dateFin: r.dateFin });
    }

    // 2) Demandes dont la date tombe dans la campagne SUIVANTE mais qui ont
    // été imputées en priorité sur CETTE campagne (reliquat N-1 consommé
    // au moment de la validation, cf. calculerPartN1 ci-dessous)
    const campagneSuivanteDebut = new Date(campagneAnnee + 1, 5, 1);
    const campagneSuivanteFin = new Date(campagneAnnee + 2, 4, 31, 23, 59, 59);
    const cpImputesIci = donnees
      ? donnees.cpDemandes.filter(
          (r) =>
            r.dateDebut >= campagneSuivanteDebut &&
            r.dateDebut <= campagneSuivanteFin &&
            (r.joursPrisSurN1 || 0) > 0
        )
      : await prisma.leaveRequest.findMany({
          where: {
            userId,
            statut: "VALIDE",
            leaveTypeId: cp.id,
            dateDebut: { gte: campagneSuivanteDebut, lte: campagneSuivanteFin },
            joursPrisSurN1: { gt: 0 },
          },
        });
    imputesSuivante = cpImputesIci;
    for (const r of cpImputesIci) {
      pris += r.joursPrisSurN1;
      prisSuivante += r.joursPrisSurN1;
      details.push({ type: "consommation", montant: -arrondi2(r.joursPrisSurN1), requestId: r.id, dateDebut: r.dateDebut, dateFin: r.dateFin, surN1: true });
    }
  }
  pris = arrondi2(pris);

  const ajustements = donnees
    ? donnees.ajustements.filter((a) => a.annee === campagneAnnee)
    : await prisma.leaveBalanceAdjustment.findMany({ where: { userId, annee: campagneAnnee } });
  // Solde écrasé sur une campagne TERMINÉE (écrasement fait après le 31 mai) :
  // la valeur saisie est le reliquat AU JOUR DE L'ÉCRASEMENT. Les congés de
  // la campagne suivante déjà commencés à cette date y sont déjà comptés ;
  // ceux qui commencent ensuite (ex. décembre, samedis compris) en sont
  // retirés. L'écart est recalculé à chaque lecture à partir de la valeur
  // saisie (motif « solde forcé à X j ») ; les ajustements suivants s'y ajoutent.
  const prisPropre = arrondi2(pris - prisSuivante);
  const ordonnes = [...ajustements].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let totalAjustements = 0;
  let soldeFige = false;
  for (const a of ordonnes) {
    const force = String(a.motif || "").match(/solde forcé à (-?[\d.,]+) ?j\)/);
    if (force && new Date(a.createdAt) > finCampagne && campagneTerminee) {
      const cible = Number(force[1].replace(",", "."));
      const date = new Date(a.createdAt);
      const dejaComptes = imputesSuivante.filter((r) => r.dateDebut < date).reduce((s, r) => s + (r.joursPrisSurN1 || 0), 0);
      const nouveau = arrondi2(cible - (acquis - prisPropre - dejaComptes));
      details.push({ type: "ajustement", montant: arrondi2(nouveau - totalAjustements), motif: a.motif, date: a.createdAt, auteurId: a.createdById });
      totalAjustements = nouveau;
      soldeFige = true;
      continue;
    }
    totalAjustements += a.montant;
    details.push({ type: "ajustement", montant: arrondi2(a.montant), motif: a.motif, date: a.createdAt, auteurId: a.createdById });
  }
  totalAjustements = arrondi2(totalAjustements);

  if (acquis > 0) {
    details.unshift({ type: "acquisition", mois: null, montant: acquis, campagne: campagneAnnee });
  }

  // Solde restant : les congés se posent par journée ou demi-journée, donc
  // le solde affiché et utilisable est arrondi à la demi-journée inférieure
  // (12,46 j acquis à ce jour → 12 j posables). Plus de « 12,46 j » à l'écran.
  //
  // Campagne terminée : l'acquis est arrondi à l'entier supérieur. Mais les
  // soldes forcés et corrections enregistrés avant cet arrondi ont été
  // calculés à partir de l'acquis exact (ex. 21,36 j forcé à 12 j → écart de
  // -9,36 j). Si l'acquis arrondi donne un résultat qui tombe entre deux
  // demi-journées, c'est le signe d'un tel ajustement : on revient alors à
  // l'acquis exact, pour retrouver le solde voulu (12 j et non 12,64 j).
  let brut = arrondi2(acquis - pris + totalAjustements);
  if (campagneTerminee && !soldeFige && !multipleDemiJour(brut)) {
    brut = arrondi2(acquisExact - pris + totalAjustements);
  }
  const disponible = Math.max(0, demiJourInferieur(brut));

  // disponibleExact : reliquat réel, sans l'arrondi à la demi-journée
  // (sert à répartir les jours entre N-1 et N).
  // soldeFinCampagne : reliquat avant les congés de la campagne suivante.
  return { campagne: campagneAnnee, acquis, pris, ajustements: totalAjustements, disponible, disponibleExact: Math.max(0, brut), soldeFinCampagne: arrondi2(brut + prisSuivante), details };
}

/**
 * Moteur de calcul du solde de CP. N et N-1 sont tous les deux recalcules a
 * partir des donnees sources - plus aucune valeur stockee n'est lue telle
 * quelle pour le CP.
 */
export async function calculerSoldeCP(prisma, userId, dateReference = new Date(), options = {}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const campagne = periodeAnnee(dateReference);
  const vide = { acquis: 0, pris: 0, ajustements: 0, disponible: 0, details: [] };

  if (!user || !user.dateEntree) {
    return { campagne, ...vide, n1: { ...vide } };
  }

  // Charge une seule fois les données communes aux campagnes N et N-1.
  // Cela évite de répéter les mêmes lectures Prisma pendant chaque affichage.
  const debutN1 = new Date(campagne - 1, 5, 1);
  const finCampagneSuivante = new Date(campagne + 2, 4, 31, 23, 59, 59);

  // Toutes les lectures indépendantes partent en parallèle. Auparavant les
  // demandes CP attendaient d'abord la lecture du type CP, ce qui ajoutait un
  // aller-retour BDD complet à chaque affichage du dashboard.
  const [cp, congesSansSolde, ajustements, cpDemandes] = await Promise.all([
    prisma.leaveType.findUnique({
      where: { code: "CP" },
      select: { id: true, code: true, libelle: true, couleur: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        statut: "VALIDE",
        leaveType: { code: "C" },
        dateDebut: { lte: new Date(campagne + 1, 4, 31, 23, 59, 59) },
        dateFin: { gte: new Date(debutN1.getTime() - MARGE_SAMEDI_MS) },
      },
      select: { id: true, dateDebut: true, dateFin: true, demiJournee: true },
    }),
    prisma.leaveBalanceAdjustment.findMany({
      where: { userId, annee: { in: [campagne, campagne - 1] } },
      select: { annee: true, montant: true, motif: true, createdAt: true, createdById: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        statut: "VALIDE",
        leaveType: { code: "CP" },
        dateDebut: { lte: finCampagneSuivante },
        dateFin: { gte: new Date(debutN1.getTime() - MARGE_SAMEDI_MS) },
      },
      select: {
        id: true,
        dateDebut: true,
        dateFin: true,
        demiJournee: true,
        joursPrisSurN1: true,
      },
    }),
  ]);

  // ajustementsVirtuels : ajustements simulés (non enregistrés), pour calculer
  // l'écart exact d'un solde écrasé (voir ecartPourSoldeCible).
  const virtuels = (options.ajustementsVirtuels || []).map((a) => ({ ...a, motif: "simulation", createdAt: new Date(), createdById: null }));
  const donneesBrutes = { cp, congesSansSolde, cpDemandes, ajustements: [...ajustements, ...virtuels] };
  // Répartition N-1 / N recalculée pour la campagne consultée (ses congés sur
  // son N-1), puis pour la campagne suivante (ses congés sur la campagne
  // consultée) : une campagne passée affichée dans l'espace comptable tient
  // ainsi compte des congés posés depuis, samedis et soldes écrasés compris.
  const donneesN = { ...donneesBrutes, cpDemandes: await repartirN1(prisma, userId, campagne, user, dateReference, donneesBrutes) };
  const donnees = { ...donneesN, cpDemandes: await repartirN1(prisma, userId, campagne + 1, user, dateReference, donneesN) };
  const [n, n1] = await Promise.all([
    calculerCampagne(prisma, userId, campagne, user, dateReference, donnees),
    calculerCampagne(prisma, userId, campagne - 1, user, dateReference, donnees),
  ]);

  return { ...n, n1 };
}

/**
 * Le reliquat N-1 est toujours consommé en premier, d'après ce qu'il reste
 * réellement (acquis, congés de N-1 et ajustements, soldes écrasés compris).
 *
 * La répartition N-1 / N est recalculée à chaque lecture : les congés payés
 * de la campagne N, dans l'ordre des dates, prennent sur le N-1 tant qu'il en
 * reste, puis sur N. La part enregistrée à la validation (joursPrisSurN1)
 * n'est plus qu'indicative : un solde N-1 écrasé ou corrigé après coup, ou un
 * samedi ajouté par la règle des jours ouvrables, est ainsi bien décompté.
 */
async function repartirN1(prisma, userId, campagne, user, dateReference, donnees) {
  const debutN = new Date(campagne, 5, 1);
  const finN = new Date(campagne + 1, 4, 31, 23, 59, 59);
  const finN1 = new Date(campagne, 4, 31, 23, 59, 59);
  // Seuls les congés qui commencent après le dernier écrasement du solde N-1
  // (fait après la fin de la campagne N-1), ou à défaut à partir de la règle
  // du samedi, sont répartis ici. Les plus anciens gardent la répartition
  // enregistrée à leur validation (et sont déjà comptés dans un solde écrasé).
  const ecrasements = donnees.ajustements
    .filter((a) => a.annee === campagne - 1 && /solde forcé à/.test(String(a.motif || "")) && new Date(a.createdAt) > finN1)
    .map((a) => new Date(a.createdAt));
  const pivot = ecrasements.length ? new Date(Math.max(...ecrasements)) : DEBUT_REGLE_SAMEDI;
  const dansN = (r) => r.dateDebut >= debutN && r.dateDebut <= finN && r.dateDebut >= pivot;
  const demandesN = donnees.cpDemandes.filter(dansN).sort((a, b) => a.dateDebut - b.dateDebut);
  if (!demandesN.length) return donnees.cpDemandes;

  // Reliquat N-1 avant l'imputation de ces congés.
  const sansImputation = donnees.cpDemandes.map((r) => (dansN(r) ? { ...r, joursPrisSurN1: 0 } : r));
  const base = await calculerCampagne(prisma, userId, campagne - 1, user, dateReference, { ...donnees, cpDemandes: sansImputation });
  let reste = base.disponibleExact;

  const parts = new Map();
  for (const r of demandesN) {
    const total = joursCPEntre(r.dateDebut, r.dateFin, r.demiJournee);
    const part = arrondi2(Math.max(0, Math.min(total, reste)));
    parts.set(r.id, part);
    reste = arrondi2(reste - part);
  }
  return donnees.cpDemandes.map((r) => (parts.has(r.id) ? { ...r, joursPrisSurN1: parts.get(r.id) } : r));
}

/**
 * A appeler AU MOMENT DE LA VALIDATION (ou de l'ajout manuel) d'une demande
 * de CP : determine combien de jours doivent etre imputes en priorite sur
 * le reliquat N-1 de la campagne concernee, en fonction de ce qu'il reste
 * reellement disponible sur N-1 a cet instant. Retourne le nombre de jours
 * a stocker dans LeaveRequest.joursPrisSurN1.
 */
export async function calculerPartN1(prisma, userId, dateDebut, jours) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.dateEntree) return 0;

  // Reliquat N-1 réel à la date du congé, compléments des autres congés
  // compris (calculerSoldeCP), sans l'arrondi à la demi-journée.
  const solde = await calculerSoldeCP(prisma, userId, new Date(dateDebut));
  return arrondi2(Math.max(0, Math.min(jours, solde.n1.disponibleExact)));
}

/**
 * Écart à enregistrer pour qu'un solde de campagne affiché soit EXACTEMENT
 * la valeur voulue (« écraser le solde »).
 *
 * Le reliquat N-1 étant consommé en premier (repartirN1), ajouter ou retirer
 * des jours sur une campagne fait aussi basculer des congés entre N-1 et N :
 * un simple « valeur voulue − solde actuel » ne tombe donc pas juste. On
 * simule l'ajustement et on le corrige jusqu'à obtenir la valeur voulue
 * (quelques itérations suffisent : la relation est linéaire par morceaux).
 */
export async function ecartPourSoldeCible(prisma, userId, campagne, cible, dateReference = new Date()) {
  // Campagne terminée : la valeur saisie est le reliquat au 31 mai (avant les
  // congés de la campagne suivante, retirés ensuite par le moteur).
  if (dateReference > new Date(campagne + 1, 4, 31, 23, 59, 59)) {
    const s = await calculerSoldeCP(prisma, userId, dateReference);
    const c = s.campagne === campagne ? s : s.campagne - 1 === campagne ? s.n1 : null;
    if (!c) return null;
    return arrondi2(cible - c.soldeFinCampagne);
  }
  const lire = async (montant) => {
    const s = await calculerSoldeCP(prisma, userId, dateReference, { ajustementsVirtuels: montant ? [{ annee: campagne, montant }] : [] });
    if (s.campagne === campagne) return s.disponible;
    if (s.campagne - 1 === campagne) return s.n1.disponible;
    return null;
  };
  let ecart = 0;
  let actuel = await lire(0);
  if (actuel === null) return null;
  for (let i = 0; i < 8 && Math.abs(actuel - cible) > 1e-6; i++) {
    ecart = arrondi2(ecart + (cible - actuel));
    actuel = await lire(ecart);
  }
  return ecart;
}
