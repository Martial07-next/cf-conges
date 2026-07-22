import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ComptablePage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!["COMPTABLE", "EMPLOYEUR", "ADMIN"].includes(session.user.role)) redirect("/dashboard");

  const annee = Number(searchParams?.annee) || new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { annee },
    include: { user: true, leaveType: true },
    orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
  });

  const byUser = new Map();
  for (const b of balances) {
    const key = b.user.id;
    if (!byUser.has(key)) byUser.set(key, { user: b.user, items: [] });
    byUser.get(key).items.push(b);
  }

  return (
    <div>
      <PageHeader
        title="Espace comptable"
        subtitle={`Soldes de congés de tous les collaborateurs — année ${annee}.`}
        action={
          <a
            href={`/api/export?annee=${annee}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-dark text-brand-cream hover:bg-brand-darker transition-colors focus-ring"
          >
            ⬇ Exporter en CSV
          </a>
        }
      />

      <div className="space-y-4">
        {[...byUser.values()].map(({ user, items }) => (
          <Card key={user.id} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-brand-dark">
                  {user.prenom} {user.nom}
                </p>
                <p className="text-xs text-brand-dark/50">{user.service || "—"}</p>
              </div>
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
        ))}
        {byUser.size === 0 && (
          <Card className="p-8 text-center text-sm text-brand-dark/60">Aucun solde initialisé pour {annee}.</Card>
        )}
      </div>
    </div>
  );
}
