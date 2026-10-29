import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { feriesEnSemaine, isoJour } from "@/lib/feriesOuverture";
import JourFerieOuvertureActions from "@/components/JourFerieOuvertureActions";

export const dynamic = "force-dynamic";

// Décision de la direction : pour chaque jour férié en semaine des 12
// prochains mois, autoriser (ou non) les collaborateurs à travailler.
export default async function JoursFeriesPage() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "feries")) redirect("/dashboard");

  const aujourdhui = new Date(new Date().toDateString());
  const dansUnAn = new Date(aujourdhui);
  dansUnAn.setFullYear(dansUnAn.getFullYear() + 1);
  const feries = feriesEnSemaine(aujourdhui, dansUnAn);

  const [decisions, reponses] = await Promise.all([
    prisma.jourFerieOuverture.findMany({ where: { date: { gte: aujourdhui, lte: dansUnAn } } }),
    prisma.jourFerieDecision.groupBy({
      by: ["date", "statut"],
      where: { date: { gte: aujourdhui, lte: dansUnAn }, souhaiteTravailler: true },
      _count: true,
    }),
  ]);
  const decisionParJour = new Map(decisions.map((d) => [isoJour(new Date(d.date)), d]));
  const decideurs = await prisma.user.findMany({
    where: { id: { in: decisions.map((d) => d.decideParId).filter(Boolean) } },
    select: { id: true, prenom: true, nom: true },
  });
  const nomDecideur = new Map(decideurs.map((u) => [u.id, `${u.prenom} ${u.nom}`]));
  function volontaires(date) {
    const iso = isoJour(date);
    const lignes = reponses.filter((r) => isoJour(new Date(r.date)) === iso);
    return {
      enAttente: lignes.find((l) => l.statut === "EN_ATTENTE")?._count || 0,
      acceptes: lignes.find((l) => l.statut === "VALIDE")?._count || 0,
    };
  }

  return (
    <div>
      <PageHeader
        title="Jours fériés"
        subtitle="Décidez si vos collaborateurs peuvent travailler les jours fériés. Si vous dites oui, ils sont prévenus et peuvent indiquer s'ils souhaitent travailler. Si vous dites non, rien ne se passe."
      />

      <Card>
        {feries.length === 0 ? (
          <EmptyState title="Aucun jour férié en semaine dans les 12 prochains mois" />
        ) : (
          <ul className="divide-y divide-black/5">
            {feries.map((f) => {
              const decision = decisionParJour.get(isoJour(f.date));
              const v = volontaires(f.date);
              return (
                <li key={f.libelle + f.date.toISOString()} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark">
                      {f.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      <span className="ml-2 font-normal text-brand-dark/50">{f.libelle}</span>
                    </p>
                    <p className="mt-1 text-xs">
                      {!decision ? (
                        <span className="font-semibold text-brand-dark/50">À décider</span>
                      ) : decision.ouvert ? (
                        <span className="font-semibold text-[#16A34A]">Travail autorisé</span>
                      ) : (
                        <span className="font-semibold text-brand-dark/60">Férié chômé</span>
                      )}
                      {decision?.decideParId && nomDecideur.get(decision.decideParId) && (
                        <span className="text-brand-dark/40"> · décidé par {nomDecideur.get(decision.decideParId)}</span>
                      )}
                      {decision?.ouvert && (v.enAttente > 0 || v.acceptes > 0) && (
                        <span className="text-brand-dark/60">
                          {" "}· {v.enAttente > 0 && `${v.enAttente} demande${v.enAttente > 1 ? "s" : ""} à valider`}
                          {v.enAttente > 0 && v.acceptes > 0 && ", "}
                          {v.acceptes > 0 && `${v.acceptes} acceptée${v.acceptes > 1 ? "s" : ""}`}
                        </span>
                      )}
                    </p>
                  </div>
                  <JourFerieOuvertureActions date={isoJour(f.date)} ouvert={decision ? decision.ouvert : null} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="mt-4 text-xs text-brand-dark/50">
        Les demandes des collaborateurs qui souhaitent travailler se valident ensuite dans{" "}
        <Link href="/employeur" className="font-semibold text-brand-greendark hover:underline">Validation & accès</Link>.
      </p>
    </div>
  );
}
