import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, EmptyState } from "@/components/ui";
import { StatusBadge, TypeBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session.user.id;
  const year = new Date().getFullYear();

  const [balances, requests, today, user] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { userId, annee: year, leaveType: { comptabiliseSolde: true } },
      include: { leaveType: true },
      orderBy: { leaveType: { ordre: "asc" } },
    }),
    prisma.leaveRequest.findMany({
      where: { userId },
      include: { leaveType: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.leaveRequest.findMany({
      where: {
        statut: "VALIDE",
        dateDebut: { lte: new Date() },
        dateFin: { gte: new Date(new Date().toDateString()) },
      },
      include: { user: true, leaveType: true },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const pendingCount = requests.filter((r) => r.statut === "EN_ATTENTE").length;

  return (
    <div>
      <PageHeader
        title={`Bonjour ${user.prenom} 👋`}
        subtitle="Votre solde de congés et l'activité récente de votre équipe."
        action={
          <Link href="/demande">
            <Button>+ Nouvelle demande</Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {balances.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.leaveType.couleur }} />
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/60">{b.leaveType.libelle}</p>
            </div>
            <p className="text-3xl font-bold text-brand-dark">
              {Math.max(0, b.joursAcquis - b.joursPris)}
              <span className="text-sm font-medium text-brand-dark/40"> / {b.joursAcquis} j</span>
            </p>
            <p className="text-xs text-brand-dark/50 mt-1">{b.joursPris} jours déjà pris cette année</p>
          </Card>
        ))}
        {balances.length === 0 && (
          <Card className="p-5 col-span-full">
            <p className="text-sm text-brand-dark/60">Aucun solde initialisé pour {year}. Contactez l'administrateur.</p>
          </Card>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
            <h2 className="font-bold text-brand-dark">Mes dernières demandes</h2>
            {pendingCount > 0 && (
              <span className="text-xs font-semibold text-brand-dark bg-brand-yellow/40 px-2.5 py-1 rounded-full">
                {pendingCount} en attente
              </span>
            )}
          </div>
          {requests.length === 0 ? (
            <EmptyState title="Aucune demande pour le moment" subtitle="Faites votre première demande de congé en 3 clics." />
          ) : (
            <ul className="divide-y divide-black/5">
              {requests.map((r) => (
                <li key={r.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <TypeBadge leaveType={r.leaveType} />
                    <span className="text-sm text-brand-dark/70 truncate">
                      {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
                    </span>
                  </div>
                  <StatusBadge statut={r.statut} />
                </li>
              ))}
            </ul>
          )}
          <div className="px-6 py-4 border-t border-black/5">
            <Link href="/mes-demandes" className="text-sm font-semibold text-brand-greendark hover:underline">
              Voir tout l'historique →
            </Link>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-5 border-b border-black/5">
            <h2 className="font-bold text-brand-dark">Absents aujourd'hui</h2>
          </div>
          {today.length === 0 ? (
            <EmptyState title="Toute l'équipe est présente" />
          ) : (
            <ul className="divide-y divide-black/5">
              {today.map((r) => (
                <li key={r.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-brand-dark truncate">
                    {r.user.prenom} {r.user.nom}
                  </span>
                  <TypeBadge leaveType={r.leaveType} />
                </li>
              ))}
            </ul>
          )}
          <div className="px-6 py-4 border-t border-black/5">
            <Link href="/planning" className="text-sm font-semibold text-brand-greendark hover:underline">
              Voir le planning complet →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
