import { periodeAnnee, estJourOuvre, joursOuvresEntre, arrondi2, JOURS_PAR_MOIS, PLAFOND_ANNUEL } from "./campagneConges";

/**
 * Moteur de calcul du solde de CP pour la campagne EN COURS (N) uniquement.
 * Le reliquat N-1 reste géré séparément (lib/soldeConges.js, système
 * déclaratif — cf. option B) : ce moteur le LIT tel quel sans le recalculer,
 * et s'assure de ne jamais compter deux fois une consommation déjà imputée
 * au N-1 au moment de la validation (via joursPrisSurN1 sur la demande).
 */
export async function calculerSoldeCP(prisma, userId, dateReference = new Date()) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const campagne = periodeAnnee(dateReference);
  const debutCampagne = new Date(campagne, 5, 1);
  const finCampagne = new Date(campagne + 1, 4, 31, 23, 59, 59);

  const cp = await prisma.leaveType.findUnique({ where: { code: "CP" } });

  // --- N-1 : lecture simple depuis la base (systeme separe, non recalcule ici) ---
  let n1 = { acquis: 0, pris: 0, disponible: 0 };
  if (cp) {
    const balanceN1 = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_annee: { userId, leaveTypeId: cp.id, annee: campagne - 1 } },
    });
    if (balanceN1) {
      n1 = {
        acquis: arrondi2(balanceN1.joursAcquis),
        pris: arrondi2(balanceN1.joursPris),
        disponible: arrondi2(Math.max(0, balanceN1.joursAcquis - balanceN1.joursPris)),
      };
    }
  }

  if (!user || !user.dateEntree) {
    return { campagne, acquis: 0, pris: 0, disponible: 0, n1, details: [] };
  }

  const dateEntree = new Date(user.dateEntree);
  const debutEffectif = dateEntree > debutCampagne ? dateEntree : debutCampagne;

  if (debutEffectif > dateReference) {
    return { campagne, acquis: 0, pris: 0, disponible: 0, n1, details: [] };
  }

  // --- 1) Acquisition N, mois par mois, congés sans solde exclus ---
  const congesSansSolde = await prisma.leaveRequest.findMany({
    where: {
      userId,
      statut: "VALIDE",
      leaveType: { code: "C" },
      dateDebut: { lte: dateReference },
      dateFin: { gte: debutCampagne },
    },
  });

  function estJourSansSolde(jour) {
    return congesSansSolde.some((c) => jour >= c.dateDebut && jour <= c.dateFin);
  }

  const details = [];
  let acquis = 0;
  let anneeIter = debutEffectif.getFullYear();
  let moisIter = debutEffectif.getMonth();
  const anneeFin = dateReference.getFullYear();
  const moisFin = dateReference.getMonth();
  const NOMS_MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

  while (anneeIter < anneeFin || (anneeIter === anneeFin && moisIter <= moisFin)) {
    const debutMois = new Date(anneeIter, moisIter, 1);
    const finMois = new Date(anneeIter, moisIter + 1, 0);
    const estMoisArrivee = anneeIter === debutEffectif.getFullYear() && moisIter === debutEffectif.getMonth();
    const debutDansCeMois = estMoisArrivee ? debutEffectif : debutMois;

    const joursOuvresMoisTotal = joursOuvresEntre(debutMois, finMois);

    let joursOuvresTravailles = 0;
    const curseur = new Date(debutDansCeMois);
    while (curseur <= finMois) {
      if (estJourOuvre(curseur) && !estJourSansSolde(curseur)) joursOuvresTravailles++;
      curseur.setDate(curseur.getDate() + 1);
    }

    if (joursOuvresMoisTotal > 0) {
      const montantMois = arrondi2((joursOuvresTravailles / joursOuvresMoisTotal) * JOURS_PAR_MOIS);
      acquis += montantMois;
      details.push({
        type: "acquisition",
        mois: `${NOMS_MOIS[moisIter]} ${anneeIter}`,
        montant: montantMois,
        complet: joursOuvresTravailles === joursOuvresMoisTotal,
      });
    }

    moisIter++;
    if (moisIter > 11) {
      moisIter = 0;
      anneeIter++;
    }
  }

  acquis = arrondi2(Math.min(PLAFOND_ANNUEL, acquis));

  // --- 2) Consommation N : uniquement la part qui n'a PAS déjà été imputée au N-1 ---
  let pris = 0;
  if (cp) {
    const cpValides = await prisma.leaveRequest.findMany({
      where: {
        userId,
        statut: "VALIDE",
        leaveTypeId: cp.id,
        dateDebut: { lte: finCampagne },
        dateFin: { gte: debutCampagne },
      },
    });

    for (const r of cpValides) {
      const debut = r.dateDebut < debutCampagne ? debutCampagne : r.dateDebut;
      const fin = r.dateFin > finCampagne ? finCampagne : r.dateFin;
      const joursTotal = joursOuvresEntre(debut, fin) * (r.demiJournee ? 0.5 : 1);
      const joursSurN = Math.max(0, joursTotal - (r.joursPrisSurN1 || 0));
      pris += joursSurN;
      details.push({
        type: "consommation",
        montant: -arrondi2(joursSurN),
        requestId: r.id,
        dateDebut: r.dateDebut,
        dateFin: r.dateFin,
        surN1: r.joursPrisSurN1 || 0,
      });
    }
  }
  pris = arrondi2(pris);

  const disponible = arrondi2(Math.max(0, acquis - pris));

  return { campagne, acquis, pris, disponible, n1, details };
}
