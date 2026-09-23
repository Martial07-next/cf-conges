import { periodeAnnee, joursOuvresEntre, joursAcquisPourCampagne, arrondi2 } from "./campagneConges";

async function calculerCampagne(prisma, userId, campagneAnnee, user, dateReference) {
  const debutCampagne = new Date(campagneAnnee, 5, 1);
  const finCampagne = new Date(campagneAnnee + 1, 4, 31, 23, 59, 59);

  const cp = await prisma.leaveType.findUnique({ where: { code: "CP" } });

  const congesSansSolde = await prisma.leaveRequest.findMany({
    where: { userId, statut: "VALIDE", leaveType: { code: "C" }, dateDebut: { lte: finCampagne }, dateFin: { gte: debutCampagne } },
  });

  const acquis = joursAcquisPourCampagne({
    campagneAnnee,
    dateEntree: user.dateEntree,
    dateSortie: user.dateSortie,
    dateReference,
    congesSansSolde,
  });

  const details = [];
  let pris = 0;

  if (cp) {
    // 1) Demandes dont la date tombe DANS cette campagne (cas normal)
    const cpDatees = await prisma.leaveRequest.findMany({
      where: { userId, statut: "VALIDE", leaveTypeId: cp.id, dateDebut: { lte: finCampagne }, dateFin: { gte: debutCampagne } },
    });
    for (const r of cpDatees) {
      const debut = r.dateDebut < debutCampagne ? debutCampagne : r.dateDebut;
      const fin = r.dateFin > finCampagne ? finCampagne : r.dateFin;
      const joursTotal = joursOuvresEntre(debut, fin) * (r.demiJournee ? 0.5 : 1);
      const joursSurCetteCampagne = Math.max(0, joursTotal - (r.joursPrisSurN1 || 0));
      pris += joursSurCetteCampagne;
      details.push({ type: "consommation", montant: -arrondi2(joursSurCetteCampagne), requestId: r.id, dateDebut: r.dateDebut, dateFin: r.dateFin });
    }

    // 2) Demandes dont la date tombe dans la campagne SUIVANTE mais qui ont
    // été imputées en priorité sur CETTE campagne (reliquat N-1 consommé
    // au moment de la validation, cf. calculerPartN1 ci-dessous)
    const campagneSuivanteDebut = new Date(campagneAnnee + 1, 5, 1);
    const campagneSuivanteFin = new Date(campagneAnnee + 2, 4, 31, 23, 59, 59);
    const cpImputesIci = await prisma.leaveRequest.findMany({
      where: {
        userId,
        statut: "VALIDE",
        leaveTypeId: cp.id,
        dateDebut: { gte: campagneSuivanteDebut, lte: campagneSuivanteFin },
        joursPrisSurN1: { gt: 0 },
      },
    });
    for (const r of cpImputesIci) {
      pris += r.joursPrisSurN1;
      details.push({ type: "consommation", montant: -arrondi2(r.joursPrisSurN1), requestId: r.id, dateDebut: r.dateDebut, dateFin: r.dateFin, surN1: true });
    }
  }
  pris = arrondi2(pris);

  const ajustements = await prisma.leaveBalanceAdjustment.findMany({ where: { userId, annee: campagneAnnee } });
  let totalAjustements = 0;
  for (const a of ajustements) {
    totalAjustements += a.montant;
    details.push({ type: "ajustement", montant: arrondi2(a.montant), motif: a.motif, date: a.createdAt, auteurId: a.createdById });
  }
  totalAjustements = arrondi2(totalAjustements);

  if (acquis > 0) {
    details.unshift({ type: "acquisition", mois: null, montant: acquis, campagne: campagneAnnee });
  }

  const disponible = arrondi2(Math.max(0, acquis - pris + totalAjustements));

  return { campagne: campagneAnnee, acquis, pris, ajustements: totalAjustements, disponible, details };
}

/**
 * Moteur de calcul du solde de CP. N et N-1 sont tous les deux recalcules a
 * partir des donnees sources - plus aucune valeur stockee n'est lue telle
 * quelle pour le CP.
 */
export async function calculerSoldeCP(prisma, userId, dateReference = new Date()) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const campagne = periodeAnnee(dateReference);
  const vide = { acquis: 0, pris: 0, ajustements: 0, disponible: 0, details: [] };

  if (!user || !user.dateEntree) {
    return { campagne, ...vide, n1: { ...vide } };
  }

  const [n, n1] = await Promise.all([
    calculerCampagne(prisma, userId, campagne, user, dateReference),
    calculerCampagne(prisma, userId, campagne - 1, user, dateReference),
  ]);

  return { ...n, n1 };
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

  const campagne = periodeAnnee(new Date(dateDebut));
  const soldeN1 = await calculerCampagne(prisma, userId, campagne - 1, user, new Date(dateDebut));

  return arrondi2(Math.max(0, Math.min(jours, soldeN1.disponible)));
}
