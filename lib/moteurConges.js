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
    const cpValides = await prisma.leaveRequest.findMany({
      where: { userId, statut: "VALIDE", leaveTypeId: cp.id, dateDebut: { lte: finCampagne }, dateFin: { gte: debutCampagne } },
    });
    for (const r of cpValides) {
      const debut = r.dateDebut < debutCampagne ? debutCampagne : r.dateDebut;
      const fin = r.dateFin > finCampagne ? finCampagne : r.dateFin;
      const jours = joursOuvresEntre(debut, fin) * (r.demiJournee ? 0.5 : 1);
      pris += jours;
      details.push({ type: "consommation", montant: -arrondi2(jours), requestId: r.id, dateDebut: r.dateDebut, dateFin: r.dateFin });
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
 * Moteur de calcul du solde de CP. N et N-1 sont desormais TOUS LES DEUX
 * recalcules a partir des donnees sources (date d'entree, date de sortie,
 * conges sans solde, CP valides, ajustements manuels) - plus aucune valeur
 * stockee n'est lue telle quelle pour le CP.
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
