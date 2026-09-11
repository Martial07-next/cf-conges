import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calculerSoldeCP } from "@/lib/moteurConges";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MonSoldePage({ searchParams }) {
  const session = await getServerSession(authOptions);
  const peutVoirAutrui = canAccessAny(session.user, ["comptable", "employeur", "admin"]);
  const userId = peutVoirAutrui && searchParams?.userId ? searchParams.userId : session.user.id;

  const [cible, solde] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    calculerSoldeCP(prisma, userId),
  ]);

  if (!cible) redirect("/dashboard");

  const historique = [...solde.details].sort((a, b) => (a.dateDebut || 0) < (b.dateDebut || 0) ? -1 : 1);

  return (
    <div>
      <PageHeader
        title={peutVoirAutrui && userId !== session.user.id ? `Solde de ${cible.prenom} ${cible.nom}` : "Mon solde de congés"}
        subtitle="Détail complet du calcul, mois par mois et demande par demande."
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-brand-dark/50">CP N disponibles</p>
          <p className="text-2xl font-bold text-brand-dark mt-1">{solde.disponible} j</p>
          <p className="text-xs text-brand-dark/50 mt-1">{solde.acquis} acquis − {solde.pris} pris</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-brand-dark/50">CP N-1 disponibles</p>
          <p className="text-2xl font-bold text-brand-dark mt-1">{solde.n1.disponible} j</p>
          <p className="text-xs text-brand-dark/50 mt-1">{solde.n1.acquis} acquis − {solde.n1.pris} pris</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-brand-dark/50">Total disponible</p>
          <p className="text-2xl font-bold text-brand-dark mt-1">{solde.disponible + solde.n1.disponible} j</p>
        </Card>
      </div>

      <Card>
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Historique du calcul</h2>
        </div>
        {historique.length === 0 ? (
          <p className="px-6 py-8 text-sm text-brand-dark/50 text-center">Rien à afficher pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {historique.map((d, i) => (
              <li key={i} className="px-6 py-3.5 flex items-center justify-between gap-3">
                <span className="text-sm text-brand-dark">
                  {d.type === "acquisition"
                    ? `Acquisition — ${d.mois}${d.complet ? "" : " (mois partiel, proratisé)"}`
                    : `Congé du ${formatDate(d.dateDebut)} au ${formatDate(d.dateFin)}${d.surN1 > 0 ? ` (dont ${d.surN1} j sur N-1)` : ""}`}
                </span>
                <span className={`text-sm font-semibold ${d.montant >= 0 ? "text-brand-greendark" : "text-alert-soft"}`}>
                  {d.montant >= 0 ? "+" : ""}{d.montant} j
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
