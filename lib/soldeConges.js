// Consomme "jours" sur le solde de congés, en puisant EN PRIORITÉ sur le
// reliquat de la campagne précédente (N-1) s'il en reste, puis sur la
// campagne en cours (N). Retourne la répartition exacte pour pouvoir
// recréditer correctement en cas d'annulation plus tard.
export async function consommerSolde(tx, { userId, leaveTypeId, annee, jours, plafondAnnuel }) {
  const anneePrecedente = annee - 1;

  const soldeN1 = await tx.leaveBalance.findUnique({
    where: { userId_leaveTypeId_annee: { userId, leaveTypeId, annee: anneePrecedente } },
  });

  const restantN1 = soldeN1 ? Math.max(0, soldeN1.joursAcquis - soldeN1.joursPris) : 0;
  const prisSurN1 = Math.min(jours, restantN1);
  const prisSurN = jours - prisSurN1;

  if (prisSurN1 > 0) {
    await tx.leaveBalance.update({
      where: { userId_leaveTypeId_annee: { userId, leaveTypeId, annee: anneePrecedente } },
      data: { joursPris: { increment: prisSurN1 } },
    });
  }

  if (prisSurN > 0) {
    await tx.leaveBalance.upsert({
      where: { userId_leaveTypeId_annee: { userId, leaveTypeId, annee } },
      update: { joursPris: { increment: prisSurN } },
      create: { userId, leaveTypeId, annee, joursAcquis: plafondAnnuel || 0, joursPris: prisSurN },
    });
  }

  return { prisSurN1, prisSurN };
}

// Recredite "jours" en respectant la repartition N-1/N enregistree au moment
// de la consommation (joursPrisSurN1), pour annuler exactement ce qui avait
// ete pris a l'epoque - meme si les soldes ont change depuis.
export async function crediterSolde(tx, { userId, leaveTypeId, annee, jours, joursPrisSurN1 }) {
  const anneePrecedente = annee - 1;
  const surN1 = Math.min(joursPrisSurN1 || 0, jours);
  const surN = jours - surN1;

  if (surN1 > 0) {
    await tx.leaveBalance.updateMany({
      where: { userId, leaveTypeId, annee: anneePrecedente },
      data: { joursPris: { decrement: surN1 } },
    });
  }

  if (surN > 0) {
    await tx.leaveBalance.updateMany({
      where: { userId, leaveTypeId, annee },
      data: { joursPris: { decrement: surN } },
    });
  }
}
