import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { calculerTicketsRestau } from "@/lib/ticketsRestau";

export const dynamic = "force-dynamic";

export default async function ComptablePage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccessAny(session.user, ["comptable", "employeur", "admin"])) redirect("/dashboard");

  const annee = Number(searchParams?.annee) || new Date().getFullYear();

  const [balances, usersVisibles] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { annee },
      include: { user: true, leaveType: true },
      orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
    }),
    prisma.user.findMany({
      where: { statutCompte: "ACTIF", visiblePlanning: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  const ticketsParUser = await calculerTicketsRestau(usersVisibles, annee);

  const byUser = new Map();
  for (const b of balances) {
    const key = b.user.id;
    if (!byUser.has(key)) byUser.set(key, { user: b.user, items: [] });
    byUser.get(key).items.push(b);
  }

  // --- Synthese globale, tous collaborateurs confondus ---
  const totauxParType = new Map(); // code -> { libelle, couleur, joursPris, comptabiliseSolde }
  for (const b of balances) {
    const key = b.leaveType.code;
    if (!totauxParType.has(key)) {
      totauxParType.set(key, {
        libelle: b.leaveType.libelle,
        couleur: b.leaveType.couleur,
        joursPris: 0,
        comptabiliseSolde: b.leaveType.comptabiliseSolde,
      });
    }
    totauxParType.get(key).joursPris += b.joursPris;
  }

  const totalTicketsRestau = usersVisibles.reduce((somme, u) => {
    const mois = ticketsParUser[u.id] || [];
    return somme + mois.reduce((a, b) => a + b, 0);
  }, 0);
  const coutTicketsRestau = totalTicketsRestau * 10;

  return (
    <div>
      <PageHeader
        title="Espace comptable"
        subtitle={`Soldes de congés et coûts réels de tous les collaborateurs (année) ${annee}.`}
        action={
          <a
            href={`/api/export?annee=${annee}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-dark text-brand-cream hover:bg-brand-darker transition-colors focus-ring"
          >
            ⬇ Exporter en CSV
          </a>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <Link href={`/comptable?annee=${annee - 1}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">‹</span>
        </Link>
        <span className="text-sm font-semibold text-brand-dark min-w-[60px] text-center">{annee}</span>
        <Link href={`/comptable?annee=${annee + 1}`}>
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring">›</span>
        </Link>
      </div>

      {/* Synthese chiffree */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Tickets restaurant</p>
          <p className="text-2xl font-bold text-brand-dark mt-1">{totalTicketsRestau}</p>
          <p className="text-xs text-brand-dark/50 mt-1">soit {coutTicketsRestau.toFixed(2)} € sur {annee}</p>
        </Card>
        {[...totauxParType.values()]
          .filter((t) => t.comptabiliseSolde)
          .slice(0, 3)
          .map((t) => (
            <Card key={t.libelle} className="p-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.couleur }} />
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">{t.libelle}</p>
              </div>
              <p className="text-2xl font-bold text-brand-dark mt-1">{t.joursPris}</p>
              <p className="text-xs text-brand-dark/50 mt-1">jours pris, tous collaborateurs</p>
            </Card>
          ))}
      </div>

      {/* Detail par type, toutes categories */}
      <Card className="mb-8 overflow-x-auto">
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Total par type de congé - {annee}</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-brand-dark/50 border-b border-black/5">
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-right">Jours pris (total entreprise)</th>
            </tr>
          </thead>
          <tbody>
            {[...totauxParType.values()].map((t) => (
              <tr key={t.libelle} className="border-b border-black/5 last:border-0">
                <td className="px-6 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-brand-dark">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.couleur }} />
                    {t.libelle}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-semibold text-brand-dark">{t.joursPris}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Detail par collaborateur (deja existant) */}
      <div className="space-y-4">
        {[...byUser.values()].map(({ user, items }) => {
          const totalTR = (ticketsParUser[user.id] || []).reduce((a, b) => a + b, 0);
          return (
            <Card key={user.id} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-brand-dark">
                    {user.prenom} {user.nom}
                  </p>
                  <p className="text-xs text-brand-dark/50">{user.service || "="}</p>
                </div>
                {totalTR > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-semibold text-brand-dark/50">Tickets restaurant</p>
                    <p className="text-sm font-bold text-brand-dark">
                      {totalTR} <span className="font-normal text-brand-dark/40">({(totalTR * 10).toFixed(2)} €)</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map((b) => (
                  <div key={b.id} className="rounded-xl bg-brand-cream/70 border border-black/5 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-brand-dark/60 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.leaveType.couleur }} />
                      {b.leaveType.code}
                    </p>
                    <p className="text-sm font-bold text-brand-dark mt-0.5">
                      {b.joursPris}
                      {b.leaveType.comptabiliseSolde ? ` / ${b.joursAcquis} j` : " j pris"}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {byUser.size === 0 && (
          <Card className="p-8 text-center text-sm text-brand-dark/60">Aucun solde initialisé pour {annee}.</Card>
        )}
      </div>
    </div>
  );
}
