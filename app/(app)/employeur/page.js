import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { TypeBadge, Pill } from "@/components/Badges";
import { ValidationActions } from "@/components/RequestActions";
import { UserActivationActions } from "@/components/UserActivationActions";

export const dynamic = "force-dynamic";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function EmployeurPage() {
  const session = await getServerSession(authOptions);
  if (!["EMPLOYEUR", "ADMIN"].includes(session.user.role)) redirect("/dashboard");

  const [pending, waitingAccounts, stats] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { statut: "EN_ATTENTE" },
      include: { user: true, leaveType: true },
      orderBy: [{ exceptionnelle: "desc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({ where: { statutCompte: "EN_ATTENTE" }, orderBy: { createdAt: "asc" } }),
    prisma.leaveRequest.groupBy({ by: ["statut"], _count: true }),
  ]);

  const statTotal = stats.reduce((s, x) => s + x._count, 0) || 1;

  return (
    <div>
      <PageHeader title="Validation & accès" subtitle="File d'attente des demandes et gestion des accès à la plateforme." />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.statut} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">{s.statut.replace("_", " ")}</p>
            <p className="text-2xl font-bold text-brand-dark mt-1">{s._count}</p>
            <div className="h-1.5 rounded-full bg-black/5 mt-2 overflow-hidden">
              <div className="h-full bg-brand-green" style={{ width: `${(s._count / statTotal) * 100}%` }} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Demandes à traiter</h2>
        </div>
        {pending.length === 0 ? (
          <EmptyState title="Aucune demande en attente" subtitle="Tout est traité 🎉" />
        ) : (
          <ul className="divide-y divide-black/5">
            {pending.map((r) => (
              <li key={r.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.exceptionnelle && <Pill tone="yellow">Prioritaire</Pill>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-dark">
                      {r.user.prenom} {r.user.nom}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <TypeBadge leaveType={r.leaveType} />
                      <span className="text-xs text-brand-dark/50">
                        {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
                      </span>
                    </div>
                    {r.motif && <p className="text-xs text-brand-dark/50 mt-1">{r.motif}</p>}
                  </div>
                </div>
                <ValidationActions requestId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Comptes en attente d'activation</h2>
        </div>
        {waitingAccounts.length === 0 ? (
          <EmptyState title="Aucun compte en attente" />
        ) : (
          <ul className="divide-y divide-black/5">
            {waitingAccounts.map((u) => (
              <li key={u.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-brand-dark">
                    {u.prenom} {u.nom}
                  </p>
                  <p className="text-xs text-brand-dark/50">{u.email}</p>
                </div>
                <UserActivationActions userId={u.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
