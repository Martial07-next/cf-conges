// Solde disponible pour chaque demande en attente, pour décider de la valider :
// jours demandés, solde au début du congé (CP N + N-1, ou compteur du type),
// reste après validation et autres demandes en attente du même type.
import { calculerSoldeCP } from "./moteurConges";
import { joursDecomptes, decompteCP, periodeAnnee, feriesEnSemaineEntre } from "./campagneConges";

const arrondi = (n) => Math.round(n * 100) / 100;

function joursDe(r) {
  return joursDecomptes(r.leaveType?.code, r.dateDebut, r.dateFin, r.demiJournee);
}

// demandes : leaveRequest avec leaveType (code, libelle, comptabiliseSolde).
// Renvoie Map(requestId -> info).
export async function soldesPourDemandes(prisma, demandes) {
  const infos = new Map();
  const maintenant = new Date();
  // Une seule évaluation du solde par personne et par date de début.
  const cacheCP = new Map();
  const soldeCP = (userId, date) => {
    const cle = `${userId}_${date.toISOString().slice(0, 10)}`;
    if (!cacheCP.has(cle)) cacheCP.set(cle, calculerSoldeCP(prisma, userId, date));
    return cacheCP.get(cle);
  };

  const autresTypes = demandes.filter((r) => r.leaveType?.comptabiliseSolde && r.leaveType.code !== "CP");
  const balances = autresTypes.length
    ? await prisma.leaveBalance.findMany({
        where: { userId: { in: [...new Set(autresTypes.map((r) => r.userId))] }, leaveTypeId: { in: [...new Set(autresTypes.map((r) => r.leaveTypeId))] } },
        select: { userId: true, leaveTypeId: true, annee: true, joursAcquis: true, joursPris: true },
      })
    : [];

  await Promise.all(
    demandes.map(async (r) => {
      const jours = joursDe(r);
      const code = r.leaveType?.code;
      // Fériés de la période : jamais décomptés.
      const feries = feriesEnSemaineEntre(new Date(r.dateDebut), new Date(r.dateFin)).map((f) => f.libelle);
      if (code !== "CP" && !r.leaveType?.comptabiliseSolde) {
        infos.set(r.id, { applicable: false, jours, feries });
        return;
      }
      // Autres demandes en attente du même type pour la même personne.
      const autres = demandes.filter((x) => x.id !== r.id && x.userId === r.userId && x.leaveTypeId === r.leaveTypeId && x.statut === "EN_ATTENTE");
      const joursAutres = arrondi(autres.reduce((s, x) => s + joursDe(x), 0));
      const date = new Date(r.dateDebut) > maintenant ? new Date(r.dateDebut) : maintenant;

      if (code === "CP") {
        const s = await soldeCP(r.userId, date);
        const disponible = arrondi(s.disponible + s.n1.disponible);
        const reste = arrondi(disponible - jours);
        infos.set(r.id, {
          applicable: true,
          type: "CP",
          jours,
          samedis: decompteCP(r.dateDebut, r.dateFin, r.demiJournee).samedis.length,
          n: arrondi(s.disponible),
          n1: arrondi(s.n1.disponible),
          disponible,
          reste,
          joursAutres,
          feries,
          suffisant: reste >= 0,
          suffisantAvecAutres: reste - joursAutres >= 0,
          futur: periodeAnnee(date) !== periodeAnnee(maintenant),
          date,
        });
        return;
      }
      const b = balances.find((x) => x.userId === r.userId && x.leaveTypeId === r.leaveTypeId && x.annee === periodeAnnee(date));
      const disponible = b ? arrondi(Math.max(0, b.joursAcquis - b.joursPris)) : 0;
      const reste = arrondi(disponible - jours);
      infos.set(r.id, { applicable: true, type: code, jours, feries, disponible, reste, joursAutres, suffisant: reste >= 0, suffisantAvecAutres: reste - joursAutres >= 0, date });
    })
  );
  return infos;
}
