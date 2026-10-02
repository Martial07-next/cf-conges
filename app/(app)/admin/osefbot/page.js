import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const retours = await prisma.osefBotFeedback.findMany({
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
  });

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

      <div className="space-y-3">
        {retours.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-sm text-brand-dark/50 dark:border-white/10">
            Aucun retour OSEFBOT pour le moment.
          </div>
        ) : (
          retours.map((retour) => (
            <article key={retour.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-brand-night">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    retour.utile === true
                      ? "bg-brand-green/15 text-brand-greendark"
                      : retour.utile === false
                        ? "bg-brand-yellow/20 text-brand-dark"
                        : "bg-black/5 text-brand-dark/50 dark:bg-white/10"
                  }`}>
                    {retour.utile === true ? "👍 Utile" : retour.utile === false ? "👎 À améliorer" : "Sans note"}
                  </span>
                  <span className="text-xs text-brand-dark/45">{retour.user.prenom} {retour.user.nom}</span>
                </div>
                <span className="text-xs text-brand-dark/40">{formatDate(retour.createdAt)}</span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.05]">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark/40">Question</p>
                  <p className="text-sm text-brand-dark">{retour.question}</p>
                </div>
                <div className="rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.05]">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark/40">Réponse OSEFBOT</p>
                  <p className="text-sm leading-relaxed text-brand-dark">{retour.reponse}</p>
                </div>
              </div>

              {retour.commentaire && (
                <div className="mt-3 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">Commentaire utilisateur</p>
                  <p className="mt-1 text-sm text-brand-dark">{retour.commentaire}</p>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
