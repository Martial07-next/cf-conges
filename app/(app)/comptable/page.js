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
  const campagneN1 = campagne - 1;

  // Le CP se calcule "a la date de reference" de la campagne consultee : si
  // c'est la campagne en cours, on s'arrete a aujourd'hui ; sinon (campagne
  // passee) on prend la toute derniere date de cette campagne, pour un
  // total complet.
  const dateReferenceCampagne =
    campagne === campagneActuelle ? new Date() : new Date(campagne + 1, 4, 31, 23, 59, 59);

  const [balances, users] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { annee: { in: [campagne, campagneN1] }, leaveType: { code: { not: "CP" } } },
      include: { user: true, leaveType: true },
      orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
    }),
    prisma.user.findMany({
      where: { statutCompte: "ACTIF", visibleCompta: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  const ticketsParUser = await calculerTicketsRestau(users, campagne);

  // CP N et N-1 : un appel au moteur par utilisateur, en parallele.
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

  const totalCPDisponible = soldesCP.reduce((s, x) => s + x.solde.disponible, 0);
  const totalCPPris = soldesCP.reduce((s, x) => s + x.solde.pris, 0);
  const totalCPN1Disponible = soldesCP.reduce((s, x) => s + x.solde.n1.disponible, 0);
  const totalTickets = users.reduce(
    (somme, user) => somme + (ticketsParUser[user.id] || []).reduce((a, b) => a + b, 0),
    0
  );

  return (
    <div>
      <PageHeader
        title="Espace comptable"
        subtitle={`Suivi des congés disponibles et consommés — campagne ${labelCampagne(campagne)}.`}
        action={
          <div className="flex items-center gap-2">
            <a href={`/api/export?annee=${campagne}`} className="inline-flex px-4 py-2.5 rounded-xl text-sm font-semibold border border-black/10 text-brand-dark hover:bg-black/5">CSV soldes</a>
            <a href={`/api/export-complet?annee=${campagne}`} className="inline-flex px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-night text-brand-cream">⬇ Export Excel complet</a>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <Link href={`/comptable?annee=${campagne - 1}`}><span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10">‹</span></Link>
        <span className="text-sm font-semibold text-brand-dark min-w-[150px] text-center">Campagne {labelCampagne(campagne)}</span>
        <Link href={`/comptable?annee=${campagne + 1}`}><span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10">›</span></Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5"><p className="text-xs font-semibold uppercase text-brand-dark/50">CP N disponibles</p><p className="text-2xl font-bold text-brand-dark mt-1">{totalCPDisponible} j</p><p className="text-xs text-brand-dark/50 mt-1">acquis moins congés pris</p></Card>
        <Card className="p-5"><p className="text-xs font-semibold uppercase text-brand-dark/50">CP N-1 disponibles</p><p className="text-2xl font-bold text-brand-dark mt-1">{totalCPN1Disponible} j</p><p className="text-xs text-brand-dark/50 mt-1">reliquat {labelCampagne(campagneN1)}</p></Card>
        <Card className="p-5"><p className="text-xs font-semibold uppercase text-brand-dark/50">CP N pris</p><p className="text-2xl font-bold text-brand-dark mt-1">{totalCPPris} j</p><p className="text-xs text-brand-dark/50 mt-1">tous collaborateurs</p></Card>
        <Card className="p-5"><p className="text-xs font-semibold uppercase text-brand-dark/50">Tickets restaurant</p><p className="text-2xl font-bold text-brand-dark mt-1">{totalTickets}</p><p className="text-xs text-brand-dark/50 mt-1">{(totalTickets * 10).toFixed(2)} €</p></Card>
      </div>

      <div className="space-y-4">
        {[...parUser.values()].map(({ user, n }) => {
          const soldeCP = soldeCPParUser.get(user.id) || { acquis: 0, pris: 0, disponible: 0, n1: { acquis: 0, pris: 0, disponible: 0 } };
          return <Card key={user.id} className="p-5">
            <div className="mb-4"><p className="font-semibold text-brand-dark">{user.prenom} {user.nom}</p><p className="text-xs text-brand-dark/50">{user.service || "—"}</p></div>
            <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-brand-cream/70 border border-black/5 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-brand-dark/60">CP N</p>
                <p className="text-sm font-bold text-brand-dark mt-0.5">{soldeCP.disponible} j disponibles</p>
                <p className="text-[11px] text-brand-dark/50">{soldeCP.pris} pris / {soldeCP.acquis} acquis</p>
              </div>
              {n.map((balance) => <div key={balance.id} className="rounded-xl bg-brand-cream/70 border border-black/5 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-brand-dark/60">{balance.leaveType.code} N</p>
                {balance.leaveType.comptabiliseSolde ? <><p className="text-sm font-bold text-brand-dark mt-0.5">{restant(balance)} j disponibles</p><p className="text-[11px] text-brand-dark/50">{balance.joursPris} pris / {balance.joursAcquis} acquis</p></> : <p className="text-sm font-bold text-brand-dark mt-0.5">{balance.joursPris} j pris</p>}
              </div>)}
              <div className="rounded-xl bg-brand-cream/70 border border-black/5 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-brand-dark/60">CP N-1</p>
                <p className="text-sm font-bold text-brand-dark mt-0.5">{soldeCP.n1.disponible} j disponibles</p>
                <p className="text-[11px] text-brand-dark/50">{soldeCP.n1.pris} pris / {soldeCP.n1.acquis} acquis</p>
              </div>
            </div>
          </Card>;
        })}
      </div>
    </div>
  );
}
