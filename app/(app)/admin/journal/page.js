import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

function formatDateTime(d) {
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function JournalPage() {
  const session = await getServerSession(authOptions);
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Journal d'audit" subtitle="Traçabilité complète : qui a fait quoi, et quand." />

      <Card>
        {logs.length === 0 ? (
          <EmptyState title="Aucune entrée pour le moment" />
        ) : (
          <ul className="divide-y divide-black/5">
            {logs.map((l) => (
              <li key={l.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-brand-dark bg-black/5 px-2 py-1 rounded-full whitespace-nowrap">
                    {l.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-brand-dark/70 truncate">
                    {l.user ? `${l.user.prenom} ${l.user.nom}` : "Système"}
                    {l.cible && <span className="text-brand-dark/40"> — {l.cible}</span>}
                  </span>
                </div>
                <span className="text-xs text-brand-dark/40 whitespace-nowrap">{formatDateTime(l.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
