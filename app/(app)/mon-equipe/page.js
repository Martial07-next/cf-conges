import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { estCadre } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { TypeBadge, Pill } from "@/components/Badges";
import { ValidationActions, CancelRequestActions, JustificatifButton } from "@/components/RequestActions";
import { formatPeriode } from "@/lib/regles";

export const dynamic = "force-dynamic";

// Espace du Cadre : référent d'un pôle, il traite les demandes de congé des
// collaborateurs de son pôle (jamais les siennes, validées par l'Employeur /
// RH ou l'administrateur).
export default async function MonEquipePage() {
  const session = await getServerSession(authOptions);
  if (!estCadre(session?.user)) redirect("/dashboard");

  const pole = session.user.pole;
  const equipe = { user: { pole }, userId: { not: session.user.id } };

  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);

  const [pending, cancelRequests, aVenir, membres] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { ...equipe, statut: "EN_ATTENTE" },
      include: { user: true, leaveType: true, piecesJointes: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ exceptionnelle: "desc" }, { createdAt: "asc" }],
    }),
    prisma.leaveRequest.findMany({
      where: { ...equipe, annulationDemandee: true },
      include: { user: true, leaveType: true },
      orderBy: { dateDemandeAnnulation: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        ...equipe,
        statut: "VALIDE",
        dateFin: { gte: aujourdHui },
        leaveType: { demandable: true, code: { notIn: ["ec", "TT"] } },
      },
      include: { user: true, leaveType: true },
      orderBy: { dateDebut: "asc" },
      take: 30,
    }),
    prisma.user.count({ where: { pole, statutCompte: "ACTIF", id: { not: session.user.id } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Mon équipe"
        subtitle={`Demandes de congé du pôle ${pole} · ${membres} collaborateur${membres > 1 ? "s" : ""}.`}
      />

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
                      <span className="text-xs text-brand-dark/50">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                    </div>
                    {r.motif && <p className="text-xs text-brand-dark/50 mt-1">{r.motif}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {r.piecesJointes?.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {r.piecesJointes.map((piece, index) => (
                        <JustificatifButton key={piece.id} requestId={r.id} attachmentId={piece.id} fileName={piece.nom || `Justificatif ${index + 1}`} />
                      ))}
                    </div>
                  ) : r.pieceJointePath ? (
                    <JustificatifButton requestId={r.id} fileName={r.pieceJointeNom} />
                  ) : null}
                  <ValidationActions requestId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-8">
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Demandes d'annulation</h2>
          <p className="text-xs text-brand-dark/50 mt-0.5">Congés déjà validés dont l'annulation est demandée par un collaborateur du pôle.</p>
        </div>
        {cancelRequests.length === 0 ? (
          <EmptyState title="Aucune demande d'annulation" subtitle="Rien à traiter pour l'instant." />
        ) : (
          <ul className="divide-y divide-black/5">
            {cancelRequests.map((r) => (
              <li key={r.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Pill tone="yellow">Annulation demandée</Pill>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-dark">
                      {r.user.prenom} {r.user.nom}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <TypeBadge leaveType={r.leaveType} />
                      <span className="text-xs text-brand-dark/50">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                    </div>
                    {r.motifAnnulation && <p className="text-xs text-brand-dark/50 mt-1">Motif : {r.motifAnnulation}</p>}
                  </div>
                </div>
                <CancelRequestActions requestId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Absences validées à venir</h2>
        </div>
        {aVenir.length === 0 ? (
          <EmptyState title="Aucune absence prévue" />
        ) : (
          <ul className="divide-y divide-black/5">
            {aVenir.map((r) => (
              <li key={r.id} className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-brand-dark">
                  {r.user.prenom} {r.user.nom}
                </span>
                <div className="flex items-center gap-2">
                  <TypeBadge leaveType={r.leaveType} />
                  <span className="text-xs text-brand-dark/50">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
