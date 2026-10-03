import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { calculerTicketsRestau } from "@/lib/ticketsRestau";
import { calculerSoldeCP } from "@/lib/moteurConges";

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

  const collaborateursSansDateEntree = users.filter((user) => !user.dateEntree).length;

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

      {collaborateursSansDateEntree > 0 && (
        <div className="mb-5 rounded-2xl border border-brand-yellow/50 bg-brand-yellow/10 px-4 py-3">
          <p className="text-sm font-bold text-brand-dark">Contrôle nécessaire</p>
          <p className="mt-0.5 text-xs text-brand-dark/60">
            {collaborateursSansDateEntree} collaborateur{collaborateursSansDateEntree > 1 ? "s n'ont" : " n'a"} pas de date d'entrée renseignée. Vérifiez cette donnée avant d'utiliser les soldes pour un traitement comptable.
          </p>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-bold text-brand-dark">Situation des collaborateurs</h2>
            <p className="mt-0.5 text-xs text-brand-dark/45">Vue de contrôle des compteurs et tickets restaurant</p>
          </div>
          <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-brand-dark/60">{users.length} dossiers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-left">
            <thead className="bg-black/[0.03]">
              <tr className="text-[10px] font-bold uppercase tracking-wide text-brand-dark/45">
                <th className="px-4 py-3">Collaborateur</th>
                <th className="px-3 py-3">Acquis campagne</th>
                <th className="px-3 py-3">Pris campagne</th>
                <th className="px-3 py-3">Solde campagne</th>
                <th className="px-3 py-3">Autres compteurs</th>
                <th className="px-3 py-3 text-center">Tickets</th>
                <th className="px-4 py-3 text-right">Contrôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {[...parUser.values()].map(({ user, n }) => {
                const soldeCP = soldeCPParUser.get(user.id) || { acquis: 0, pris: 0, disponible: 0, n1: { acquis: 0, pris: 0, disponible: 0 } };
                const tickets = (ticketsParUser[user.id] || []).reduce((a, b) => a + b, 0);
                return (
                  <tr key={user.id} className="hover:bg-black/[0.025]">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-brand-dark">{user.prenom} {user.nom}</p>
                      <p className="text-[11px] text-brand-dark/45">{user.service || "Service non renseigné"}</p>
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-brand-dark">{soldeCP.acquis} j</td>
                    <td className="px-3 py-3 text-sm font-semibold text-brand-dark/70">{soldeCP.pris} j</td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-bold text-brand-dark">{soldeCP.disponible} j</p>
                    </td>
                    <td className="px-3 py-3">
                      {n.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {n.map((balance) => (
                            <span key={balance.id} className="rounded-md bg-black/5 px-2 py-1 text-[10px] font-semibold text-brand-dark/65">
                              {balance.leaveType.code} {balance.leaveType.comptabiliseSolde ? `${restant(balance)} j` : `${balance.joursPris} j pris`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-brand-dark/30">Aucun</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex min-w-10 justify-center rounded-lg bg-[rgb(10_254_107)]/15 px-2 py-1 text-xs font-bold text-brand-dark">{tickets}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!user.dateEntree ? (
                        <span className="mr-3 inline-flex rounded-full bg-brand-yellow/20 px-2 py-1 text-[10px] font-bold text-brand-dark">Date d'entrée manquante</span>
                      ) : null}
                      <Link href={`/mon-solde?userId=${user.id}`} className="text-xs font-bold text-brand-greendark hover:underline">
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 text-[11px] text-brand-dark/40">
        Les données affichées restent calculées par les moteurs actuels de CF Congés. L'export Excel complet conserve son fonctionnement existant.
      </p>
    </div>
  );
}
