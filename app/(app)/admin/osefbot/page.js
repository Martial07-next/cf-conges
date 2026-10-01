import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OsefBotFeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const [total, positifs, negatifs, items] = await Promise.all([
    prisma.osefBotFeedback.count({ where: { utile: { not: null } } }),
    prisma.osefBotFeedback.count({ where: { utile: true } }),
    prisma.osefBotFeedback.count({ where: { utile: false } }),
    prisma.osefBotFeedback.findMany({
      where: { utile: { not: null } },
      include: { user: { select: { prenom: true, nom: true } } },
      orderBy: [{ utile: "asc" }, { ratedAt: "desc" }],
      take: 100,
    }),
  ]);
  const satisfaction = total ? Math.round((positifs / total) * 100) : null;

  return (
    <div>
      <PageHeader title="Feedback OSEFBOT" subtitle="Questions et évaluations pour améliorer progressivement les réponses." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-brand-dark/50">Réponses évaluées</p><p className="mt-1 text-3xl font-bold text-brand-dark">{total}</p></Card>
        <Card className="p-5"><p className="text-xs text-brand-dark/50">Satisfaction</p><p className="mt-1 text-3xl font-bold text-brand-dark">{satisfaction === null ? "—" : `${satisfaction}%`}</p></Card>
        <Card className="p-5"><p className="text-xs text-brand-dark/50">À améliorer</p><p className="mt-1 text-3xl font-bold text-brand-dark">{negatifs}</p></Card>
      </div>
      <Card className="overflow-hidden">
        {items.length === 0 ? <p className="p-6 text-sm text-brand-dark/50">Aucun feedback pour le moment.</p> : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {items.map((item) => (
              <li key={item.id} className="p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-lg">{item.utile ? "👍" : "👎"}</span>
                  <span className="text-xs font-semibold text-brand-dark">{item.user.prenom} {item.user.nom}</span>
                  <span className="text-[10px] text-brand-dark/40">{item.ratedAt ? new Date(item.ratedAt).toLocaleString("fr-FR") : ""}</span>
                </div>
                <p className="text-sm font-semibold text-brand-dark">Q. {item.question}</p>
                <p className="mt-1 text-sm text-brand-dark/65">OSEFBOT : {item.reponse}</p>
                {item.commentaire && <p className="mt-2 rounded-xl bg-brand-yellow/15 px-3 py-2 text-xs text-brand-dark">Retour : {item.commentaire}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
