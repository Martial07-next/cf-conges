import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OsefBotFeedbackList from "@/components/OsefBotFeedbackList";
import OsefBotKnowledgeManager from "@/components/OsefBotKnowledgeManager";

export const dynamic = "force-dynamic";

function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function OsefBotFeedbackAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [retours, connaissances] = await Promise.all([prisma.osefBotFeedback.findMany({
    select: {
      id: true,
      question: true,
      reponse: true,
      utile: true,
      commentaire: true,
      createdAt: true,
      ratedAt: true,
      user: { select: { prenom: true, nom: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  }), prisma.osefBotKnowledge.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id:true, questionReference:true, reponse:true, formulations:true, actionLabel:true, actionHref:true, actif:true, updatedAt:true },
  })]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand-green">ADMINISTRATION</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">Retours OSEFBOT</h1>
        <p className="mt-2 text-sm text-brand-dark/55">
          Les 100 dernières interactions enregistrées permettent d’identifier les réponses à améliorer.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-brand-night">
          <p className="text-xs text-brand-dark/45">Interactions</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{retours.length}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-brand-night">
          <p className="text-xs text-brand-dark/45">Réponses utiles</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{retours.filter((r) => r.utile === true).length}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-brand-night">
          <p className="text-xs text-brand-dark/45">À améliorer</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{retours.filter((r) => r.utile === false).length}</p>
        </div>
      </div>

      <OsefBotKnowledgeManager connaissances={connaissances.map((k) => ({ ...k, updatedAt: formatDate(k.updatedAt) }))} />

      <OsefBotFeedbackList
        retours={retours.map((r) => ({
          id: r.id,
          question: r.question,
          reponse: r.reponse,
          utile: r.utile,
          commentaire: r.commentaire,
          utilisateur: `${r.user.prenom} ${r.user.nom}`,
          date: formatDate(r.createdAt),
        }))}
      />
    </div>
  );
}
