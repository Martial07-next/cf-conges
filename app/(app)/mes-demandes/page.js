import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { StatusBadge, TypeBadge } from "@/components/Badges";
import { CancelButton } from "@/components/RequestActions";

export const dynamic = "force-dynamic";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MesDemandesPage() {
  const session = await getServerSession(authOptions);

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    include: { leaveType: true, valideur: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Mes demandes" subtitle="Historique complet et statut de vos demandes de congé." />

      <Card>
        {requests.length === 0 ? (
          <EmptyState title="Aucune demande" subtitle="Vos demandes de congé apparaîtront ici." />
        ) : (
          <ul className="divide-y divide-black/5">
            {requests.map((r) => (
              <li key={r.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <TypeBadge leaveType={r.leaveType} />
                  <div className="min-w-0">
                    <p className="text-sm text-brand-dark truncate">
                      {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
                      {r.demiJournee && <span className="text-brand-dark/50"> (demi-journée)</span>}
                      {r.exceptionnelle && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-brand-dark bg-brand-yellow/40 px-1.5 py-0.5 rounded-full">
                          Exceptionnelle
                        </span>
                      )}
                    </p>
                    {r.motif && <p className="text-xs text-brand-dark/50 truncate mt-0.5">{r.motif}</p>}
                    {r.statut === "REFUSE" && r.commentaireRefus && (
                      <p className="text-xs text-alert-soft mt-0.5">Refus : {r.commentaireRefus}</p>
                    )}
                    {r.valideur && r.statut !== "EN_ATTENTE" && r.statut !== "ANNULE" && (
                      <p className="text-[11px] text-brand-dark/40 mt-0.5">
                        par {r.valideur.prenom} {r.valideur.nom}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge statut={r.statut} />
                  {r.statut === "EN_ATTENTE" && <CancelButton requestId={r.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
