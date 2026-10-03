import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { calculerTicketsRestau } from "@/lib/ticketsRestau";
import { calculerSoldeCP } from "@/lib/moteurConges";
import ComptableTable from "@/components/ComptableTable";

export const dynamic = "force-dynamic";

const restant = (balance) => Math.max(0, balance.joursAcquis - balance.joursPris);
const campagneDepuisDate = (date = new Date()) =>
  date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
const labelCampagne = (annee) => `${annee}–${annee + 1}`;

export default async function ComptablePage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccessAny(session.user, ["comptable", "employeur", "admin"])) redirect("/dashboard");

  const campagneActuelle = campagneDepuisDate();
  const campagne = Number(searchParams?.annee) || campagneActuelle;

  // Le CP se calcule "a la date de reference" de la campagne consultee : si
  // c'est la campagne en cours, on s'arrete a aujourd'hui ; sinon (campagne
  // passee) on prend la toute derniere date de cette campagne, pour un
  // total complet.
  const dateReferenceCampagne =
    campagne === campagneActuelle ? new Date() : new Date(campagne + 1, 4, 31, 23, 59, 59);

  const [balances, users] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { annee: campagne, leaveType: { code: { not: "CP" } } },
      include: { user: true, leaveType: true },
      orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
    }),
    prisma.user.findMany({
      where: { statutCompte: "ACTIF", visibleCompta: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  const ticketsParUser = await calculerTicketsRestau(users, campagne);

  // Le comptable consulte une campagne à la fois. Le moteur est appelé à la
  // date de référence de la campagne sélectionnée pour obtenir son total.
  const soldesCP = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      solde: await calculerSoldeCP(prisma, user.id, dateReferenceCampagne),
    }))
  );
  const soldeCPParUser = new Map(soldesCP.map((s) => [s.userId, s.solde]));

  const idsVisibles = new Set(users.map((user) => user.id));
  const balancesN = balances.filter((balance) => balance.annee === campagne && idsVisibles.has(balance.userId));
  const parUser = new Map(users.map((user) => [user.id, { user, n: [] }]));
  for (const balance of balancesN) {
    const ligne = parUser.get(balance.userId);
    if (ligne) ligne.n.push(balance);
  }

  const totalCPAcquis = soldesCP.reduce((s, x) => s + x.solde.acquis, 0);
  const totalCPPris = soldesCP.reduce((s, x) => s + x.solde.pris, 0);
  const totalCPDisponible = soldesCP.reduce((s, x) => s + x.solde.disponible, 0);
  const totalTickets = users.reduce(
    (somme, user) => somme + (ticketsParUser[user.id] || []).reduce((a, b) => a + b, 0),
    0
  );

  const debutCampagne = new Date(campagne, 5, 1);
  const finCampagne = new Date(campagne + 1, 4, 31, 23, 59, 59);
  const controles = [];

  for (const user of users) {
    const soldeCP = soldeCPParUser.get(user.id);
    if (!user.dateEntree) {
      controles.push({
        user,
        niveau: "important",
        titre: "Date d'entrée manquante",
        detail: "Le calcul des droits CP ne peut pas être fiabilisé sans date d'entrée.",
      });
      continue;
    }

    const entree = new Date(user.dateEntree);
    const concerneCampagne = entree <= finCampagne;

    if (concerneCampagne && soldeCP && soldeCP.acquis < 0) {
      controles.push({
        user,
        niveau: "important",
        titre: "Acquis CP incohérent",
        detail: "Le total acquis calculé est négatif et doit être vérifié.",
      });
    }

    if (concerneCampagne && soldeCP && soldeCP.pris < 0) {
      controles.push({
        user,
        niveau: "important",
        titre: "Consommation CP incohérente",
        detail: "Le nombre de jours consommés est négatif et doit être vérifié.",
      });
    }

    if (concerneCampagne && soldeCP && soldeCP.pris > soldeCP.acquis && soldeCP.disponible === 0) {
      controles.push({
        user,
        niveau: "attention",
        titre: "CP consommés supérieurs aux acquis",
        detail: `${soldeCP.pris} j consommés pour ${soldeCP.acquis} j acquis sur la campagne.`,
      });
    }
  }


  return (
    <div>
      <PageHeader
        title="Espace comptable"
        subtitle={`Poste de contrôle social et avantages salariés · campagne ${labelCampagne(campagne)}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/api/export?annee=${campagne}`} className="inline-flex px-4 py-2.5 rounded-xl text-sm font-semibold border border-black/10 text-brand-dark hover:bg-black/5">
              Export CSV
            </a>
            <a href={`/api/export-complet?annee=${campagne}`} className="inline-flex px-4 py-2.5 rounded-xl text-sm font-bold bg-brand-night text-brand-cream dark:bg-[rgb(10_254_107)] dark:text-[#16231a]">
              ↓ Export Excel complet
            </a>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 dark:border-white/10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark/45">Période de travail</p>
          <div className="mt-1 flex items-center gap-2">
            <Link href={`/comptable?annee=${campagne - 1}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-brand-dark hover:bg-black/5">‹</Link>
            <span className="min-w-[155px] text-center text-sm font-bold text-brand-dark">Campagne {labelCampagne(campagne)}</span>
            <Link href={`/comptable?annee=${campagne + 1}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-brand-dark hover:bg-black/5">›</Link>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-brand-dark/45">Population suivie</p>
          <p className="text-sm font-bold text-brand-dark">{users.length} collaborateur{users.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-dark/45">CP acquis</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{totalCPAcquis.toFixed(2)} j</p>
          <p className="mt-1 text-[11px] text-brand-dark/45">campagne {labelCampagne(campagne)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-dark/45">CP consommés</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{totalCPPris.toFixed(2)} j</p>
          <p className="mt-1 text-[11px] text-brand-dark/45">sur la campagne sélectionnée</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-dark/45">CP restants</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{totalCPDisponible.toFixed(2)} j</p>
          <p className="mt-1 text-[11px] text-brand-dark/45">acquis moins consommés</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-dark/45">Tickets restaurant</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{totalTickets}</p>
          <p className="mt-1 text-[11px] text-brand-dark/45">Valeur indicative {(totalTickets * 10).toFixed(2)} €</p>
        </Card>
      </div>

      <ComptableTable
        lignes={[...parUser.values()].map(({ user, n }) => {
          const soldeCP = soldeCPParUser.get(user.id) || { acquis: 0, pris: 0, disponible: 0 };
          return {
            id: user.id,
            prenom: user.prenom,
            nom: user.nom,
            pole: user.pole || user.service || "",
            acquis: soldeCP.acquis,
            pris: soldeCP.pris,
            disponible: soldeCP.disponible,
            tickets: (ticketsParUser[user.id] || []).reduce((a, b) => a + b, 0),
            autresCompteurs: n.map((balance) => ({
              id: balance.id,
              code: balance.leaveType.code,
              valeur: balance.leaveType.comptabiliseSolde
                ? `${restant(balance)} j`
                : `${balance.joursPris} j pris`,
            })),
            controles: controles
              .filter((controle) => controle.user.id === user.id)
              .map((controle) => ({ titre: controle.titre, detail: controle.detail })),
          };
        })}
      />

      <p className="mt-3 text-[11px] text-brand-dark/40">
        Les données affichées restent calculées par les moteurs actuels de CF Congés. L'export Excel complet conserve son fonctionnement existant.
      </p>
    </div>
  );
}
