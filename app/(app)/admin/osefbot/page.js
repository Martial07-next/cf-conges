import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OsefBotFeedbackList from "@/components/OsefBotFeedbackList";
import BandeauPage, { TuileChiffre } from "@/components/BandeauPage";
import AdminNav from "@/components/AdminNav";
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
    select: { id:true, questionReference:true, reponse:true, formulations:true, actionLabel:true, actionHref:true, actif:true, nombreUtilisations:true, derniereUtilisation:true, updatedAt:true, feedbacks: { where: { utile: { not: null } }, select: { utile:true } } },
  })]);

  return (
    <div className="space-y-6">
      <div>
        <BandeauPage icone="notifications" titre="MatthiasBot" sousTitre="Retours des utilisateurs (100 dernières interactions) et connaissances apprises" />
        <AdminNav actif="/admin/osefbot" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <TuileChiffre valeur={retours.length} label="interactions" couleur="#0afe6b" />
          <TuileChiffre valeur={retours.filter((r) => r.utile === true).length} label="réponses utiles 👍" couleur="#16A34A" />
          <TuileChiffre valeur={retours.filter((r) => r.utile === false).length} label="à améliorer 👎" couleur="#DC2626" />
          <TuileChiffre valeur={connaissances.filter((k) => k.actif).length} label="connaissances actives" couleur="#2563EB" />
        </div>
      </div>

      <OsefBotKnowledgeManager connaissances={connaissances.map((k) => ({ ...k, avisPositifs: k.feedbacks.filter((f) => f.utile === true).length, avisNegatifs: k.feedbacks.filter((f) => f.utile === false).length, feedbacks: undefined, updatedAt: formatDate(k.updatedAt), derniereUtilisation: k.derniereUtilisation ? formatDate(k.derniereUtilisation) : null }))} />

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
