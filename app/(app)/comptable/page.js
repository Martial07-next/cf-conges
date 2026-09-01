import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { calculerTicketsRestau } from "@/lib/ticketsRestau";

export const dynamic = "force-dynamic";

const restant = (balance) => Math.max(0, balance.joursAcquis - balance.joursPris);
const campagneDepuisDate = (date = new Date()) =>
  date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
const labelCampagne = (annee) => `${annee}–${annee + 1}`;

export default async function ComptablePage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccessAny(session.user, ["comptable", "employeur", "admin"])) redirect("/dashboard");

  const campagne = Number(searchParams?.annee) || campagneDepuisDate();
  const campagneN1 = campagne - 1;
  const [balances, users] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { annee: { in: [campagne, campagneN1] } },
      include: { user: true, leaveType: true },
      orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
    }),
    prisma.user.findMany({
      where: { statutCompte: "ACTIF", visibleCompta: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  const ticketsParUser = await calculerTicketsRestau(users, campagne);
  const idsVisibles = new Set(users.map((user) => user.id));
  const balancesN = balances.filter((balance) => balance.annee === campagne && idsVisibles.has(balance.userId));
  const balancesN1 = balances.filter((balance) => balance.annee === campagneN1 && idsVisibles.has(balance.userId));
  const parUser = new Map(users.map((user) => [user.id, { user, n: [], n1: [] }]));
  for (const balance of [...balancesN, ...balancesN1]) {
    const ligne = parUser.get(balance.userId);
    if (balance.annee === campagne) ligne.n.push(balance);
    else ligne.n1.push(balance);
  }

  const cpN = balancesN.filter((balance) => balance.leaveType.code === "CP");
  const cpN1 = balancesN1.filter((balance) => balance.leaveType.code === "CP");
  const total = (liste, champ) => liste.reduce((somme, item) => somme + item[champ], 0);
  const totalRestant = (liste) => liste.reduce((somme, balance) => somme + restant(balance), 0);
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
            <a href={`/api/export-complet?annee=${campagne}`} className="inline-flex px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-dark text-brand-cream">⬇ Export Excel complet</a>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <Link href={`/comptable?annee=${campagne - 1}`}><span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10">‹</span></Link>
        <span className="text-sm font-semibold text-brand-dark min-w-[150px] text-center">Campagne {labelCampagne(campagne)}</span>
        <Link href={`/comptable?annee=${campagne + 1}`}><span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10">›</span></Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5"><p className="text-xs font-semibold uppercase text-brand-dark/50">CP N disponibles</p><p className="text-2xl font-bold text-brand-dark mt-1">{totalRestant(cpN)} j</p><p className="text-xs text-brand-dark/50 mt-1">acquis moins congés pris</p></Card>
        <Card className="p-5"><p className="text-xs font-semibold uppercase text-brand-dark/50">CP N-1 disponibles</p><p className="text-2xl font-bold text-brand-dark mt-1">{totalRestant(cpN1)} j</p><p className="text-xs text-brand-dark/50 mt-1">reliquat {labelCampagne(campagneN1)}</p></Card>
        <Card className="p-5"><p className="text-xs font-semibold uppercase text-brand-dark/50">CP N pris</p><p className="text-2xl font-bold text-brand-dark mt-1">{total(cpN, "joursPris")} j</p><p className="text-xs text-brand-dark/50 mt-1">tous collaborateurs</p></Card>
        <Card className="p-5"><p className="text-xs font-semibold uppercase text-brand-dark/50">Tickets restaurant</p><p className="text-2xl font-bold text-brand-dark mt-1">{totalTickets}</p><p className="text-xs text-brand-dark/50 mt-1">{(totalTickets * 10).toFixed(2)} €</p></Card>
      </div>

      <div className="space-y-4">
        {[...parUser.values()].map(({ user, n, n1 }) => {
          const reportCP = n1.find((balance) => balance.leaveType.code === "CP");
          return <Card key={user.id} className="p-5">
            <div className="mb-4"><p className="font-semibold text-brand-dark">{user.prenom} {user.nom}</p><p className="text-xs text-brand-dark/50">{user.service || "—"}</p></div>
            <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-3">
              {n.map((balance) => <div key={balance.id} className="rounded-xl bg-brand-cream/70 border border-black/5 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-brand-dark/60">{balance.leaveType.code} N</p>
                {balance.leaveType.comptabiliseSolde ? <><p className="text-sm font-bold text-brand-dark mt-0.5">{restant(balance)} j disponibles</p><p className="text-[11px] text-brand-dark/50">{balance.joursPris} pris / {balance.joursAcquis} acquis</p></> : <p className="text-sm font-bold text-brand-dark mt-0.5">{balance.joursPris} j pris</p>}
              </div>)}
              <div className="rounded-xl bg-brand-cream/70 border border-black/5 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-brand-dark/60">CP N-1</p>
                <p className="text-sm font-bold text-brand-dark mt-0.5">{reportCP ? restant(reportCP) : 0} j disponibles</p>
                {reportCP && <p className="text-[11px] text-brand-dark/50">{reportCP.joursPris} pris / {reportCP.joursAcquis} acquis</p>}
              </div>
            </div>
          </Card>;
        })}
      </div>
    </div>
  );
}
