const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const JOURS_PAR_MOIS = 2.5;
const PLAFOND_ANNUEL = 30;

function arrondi2(x) {
  return Math.round(x * 100) / 100;
}
function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 6 ? y : y - 1;
}
function estJourOuvre(date) {
  const jour = date.getDay();
  return jour !== 0 && jour !== 6;
}
function joursOuvresEntre(debut, fin) {
  if (fin < debut) return 0;
  let count = 0;
  const curseur = new Date(debut);
  while (curseur <= fin) {
    if (estJourOuvre(curseur)) count++;
    curseur.setDate(curseur.getDate() + 1);
  }
  return count;
}
function joursAcquisPourCampagne({ campagneAnnee, dateEntree, dateSortie, dateReference, congesSansSolde = [] }) {
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
    if (joursOuvresMoisTotal > 0) total += (joursOuvresTravailles / joursOuvresMoisTotal) * JOURS_PAR_MOIS;

    moisIter++;
    if (moisIter > 11) { moisIter = 0; anneeIter++; }
  }

  return arrondi2(Math.max(0, Math.min(PLAFOND_ANNUEL, total)));
}

async function calculerPourCampagne(user, campagneAnnee, cpId, dateReference) {
  const debutCampagne = new Date(campagneAnnee, 5, 1);
  const finCampagne = new Date(campagneAnnee + 1, 4, 31, 23, 59, 59);

  const congesSansSolde = await prisma.leaveRequest.findMany({
    where: { userId: user.id, statut: "VALIDE", leaveType: { code: "C" }, dateDebut: { lte: finCampagne }, dateFin: { gte: debutCampagne } },
  });

  return joursAcquisPourCampagne({
    campagneAnnee,
    dateEntree: user.dateEntree,
    dateSortie: user.dateSortie,
    dateReference,
    congesSansSolde,
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const now = new Date();
  const campagne = periodeAnnee(now);

  const cp = await prisma.leaveType.findUnique({ where: { code: "CP" } });
  if (!cp) {
    console.error("Type de congé CP introuvable — rien à faire.");
    process.exit(1);
  }

  const users = await prisma.user.findMany({ where: { dateEntree: { not: null } } });

  console.log(`Mode : ${apply ? "APPLY (écrit en base)" : "DRY-RUN (aucune écriture)"}`);
  console.log(`Campagne courante : ${campagne}-${campagne + 1}\n`);

  for (const user of users) {
    for (const annee of [campagne, campagne - 1]) {
      const nouveau = await calculerPourCampagne(user, annee, cp.id, now);

      const existant = await prisma.leaveBalance.findUnique({
        where: { userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: cp.id, annee } },
      });
      const ancien = existant ? existant.joursAcquis : 0;

      if (Math.abs(ancien - nouveau) > 0.01 || (!existant && nouveau > 0)) {
        console.log(
          `${user.prenom} ${user.nom} — campagne ${annee} : ${ancien} → ${nouveau} (${nouveau - ancien >= 0 ? "+" : ""}${arrondi2(nouveau - ancien)})`
        );

        if (apply && nouveau > 0) {
          await prisma.leaveBalance.upsert({
            where: { userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: cp.id, annee } },
            update: { joursAcquis: nouveau },
            create: { userId: user.id, leaveTypeId: cp.id, annee, joursAcquis: nouveau, joursPris: 0 },
          });
        }
      }
    }
  }

  console.log(
    apply
      ? "\nTerminé — les valeurs ci-dessus ont été écrites en base."
      : "\nDRY-RUN terminé — rien n'a été modifié. Relancez avec --apply pour appliquer ces changements."
  );
  console.log(
    "\nRappel : ce script calcule le solde THÉORIQUE (comme si personne n'avait jamais rien pris avant la plateforme). " +
      "Si vous savez qu'une personne a réellement consommé des jours avant la mise en place de l'outil, " +
      "utilisez Admin > Soldes > Ajustement manuel pour corriger la différence, avec motif."
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
