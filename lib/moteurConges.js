import { periodeAnnee, estJourOuvre, joursOuvresEntre, arrondi2, JOURS_PAR_MOIS, PLAFOND_ANNUEL } from "./campagneConges";

/**
 * Moteur de calcul UNIQUE du solde de CP d'un collaborateur, pour une
 * campagne (juin -> mai) et une date de référence données. Ne lit AUCUNE
 * valeur stockée type "joursAcquis" cumulé — reconstruit tout depuis :
 * - la date d'entrée
 * - les congés sans solde validés (qui réduisent les jours "travaillés" pris
 *   en compte pour l'acquisition, mois par mois)
 * - les CP validés déjà consommés sur la campagne
 *
 * Toutes les pages de l'app doivent appeler CETTE fonction plutôt que de
 * lire LeaveBalance.joursAcquis directement pour le CP.
 */
export async function calculerSoldeCP(prisma, userId, dateReference = new Date()) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const campagne = periodeAnnee(dateReference);
  const debutCampagne = new Date(campagne, 5, 1);
  const finCampagne = new Date(campagne + 1, 4, 31, 23, 59, 59);

  if (!user || !user.dateEntree) {
    return { campagne, acquis: 0, pris: 0, disponible: 0, details: [] };
  }

  const dateEntree = new Date(user.dateEntree);
  const debutEffectif = dateEntree > debutCampagne ? dateEntree : debutCampagne;
  if (debutEffectif > dateReference) {
    return { campagne, acquis: 0, pris: 0, disponible: 0, details: [] };
  }

  const cp = await prisma.leaveType.findUnique({ where: { code: "CP" } });
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

  // --- 1) Acquisition, mois par mois, en excluant les jours sans solde ---
  const details = [];
  let acquis = 0;
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
        mois: `${["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"][moisIter]} ${anneeIter}`,
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

  // --- 2) Consommation : CP valides sur la campagne ---
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
      const jours = joursOuvresEntre(debut, fin) * (r.demiJournee ? 0.5 : 1);
      pris += jours;
      details.push({ type: "consommation", mois: null, montant: -arrondi2(jours), requestId: r.id, dateDebut: r.dateDebut, dateFin: r.dateFin });
    }
  }
  pris = arrondi2(pris);

  const disponible = arrondi2(Math.max(0, acquis - pris));

  return { campagne, acquis, pris, disponible, details };
}
