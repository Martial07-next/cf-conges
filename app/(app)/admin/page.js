import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import BandeauPage, { TuileChiffre } from "@/components/BandeauPage";
import AdminNav from "@/components/AdminNav";
import Icone from "@/components/Icone";
import TestPushButton from "@/components/TestPushButton";

export const dynamic = "force-dynamic";

function formatDateHeure(d) {
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const employeurRH = session?.user?.role === "EMPLOYEUR";
  const estAdmin = session?.user?.role === "ADMIN";
  if (!employeurRH && !canAccess(session?.user, "admin")) redirect("/dashboard");

  const [actifs, enAttente, desactives, types, motifs, logs, retoursNegatifs, connaissances, demandesEnAttente, verifications, abonnesPush, derniersLogs, dernierMessage] = await Promise.all([
    prisma.user.count({ where: { statutCompte: "ACTIF" } }),
    prisma.user.count({ where: { statutCompte: "EN_ATTENTE" } }),
    prisma.user.count({ where: { statutCompte: "DESACTIVE" } }),
    prisma.leaveType.count(),
    prisma.leaveTypeMotif.count(),
    prisma.auditLog.count(),
    prisma.osefBotFeedback.count({ where: { utile: false } }),
    prisma.osefBotKnowledge.count({ where: { actif: true } }),
    prisma.leaveRequest.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.verificationSolde.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.pushSubscription.count(),
    employeurRH ? Promise.resolve([]) : prisma.auditLog.findMany({ include: { user: { select: { prenom: true, nom: true } } }, orderBy: { date: "desc" }, take: 6 }),
    employeurRH ? Promise.resolve(null) : prisma.auditLog.findFirst({ where: { action: "MESSAGE_QUOTIDIEN_ENVOYE" }, orderBy: { date: "desc" }, select: { date: true } }),
  ]);

  const sections = [
    { href: "/admin/utilisateurs", icone: "utilisateurs", titre: "Utilisateurs", desc: "Comptes, rôles, pôles, accès, visibilité, tickets restaurant.", valeur: `${actifs} actif${actifs > 1 ? "s" : ""}`, employeur: true },
    { href: "/admin/soldes", icone: "solde", titre: "Congés & soldes", desc: "Congés déjà pris, ajustements manuels de solde.", valeur: "Saisie", employeur: true },
    { href: "/admin/types-conges", icone: "types", titre: "Types de congés", desc: "Codes, couleurs, plafonds, décompte du solde, tickets.", valeur: `${types} types` },
    { href: "/admin/motifs", icone: "demande", titre: "Motifs à durée fixe", desc: "ASA et événements familiaux : mariage, décès, naissance…", valeur: `${motifs} motifs` },
    { href: "/admin/journal", icone: "journal", titre: "Journal d’audit", desc: "Qui a fait quoi, et quand : traçabilité complète.", valeur: `${logs} entrées` },
    { href: "/admin/osefbot", icone: "notifications", titre: "MatthiasBot", desc: "Retours des utilisateurs et connaissances apprises.", valeur: `${connaissances} connaissance${connaissances > 1 ? "s" : ""}`, adminSeul: true },
  ].filter((s) => (employeurRH ? s.employeur : true) && (!s.adminSeul || estAdmin));

  // Points qui demandent une action, avec le lien pour les traiter.
  const aSurveiller = [
    enAttente > 0 && { texte: `${enAttente} compte${enAttente > 1 ? "s" : ""} en attente d’activation`, href: "/employeur#comptes", couleur: "#9333EA" },
    demandesEnAttente > 0 && { texte: `${demandesEnAttente} demande${demandesEnAttente > 1 ? "s" : ""} de congé à valider`, href: "/employeur#demandes", couleur: "#EAB308" },
    verifications > 0 && { texte: `${verifications} vérification${verifications > 1 ? "s" : ""} de solde demandée${verifications > 1 ? "s" : ""}`, href: "/employeur#verifications", couleur: "#2563EB" },
    estAdmin && retoursNegatifs > 0 && { texte: `${retoursNegatifs} réponse${retoursNegatifs > 1 ? "s" : ""} de MatthiasBot jugée${retoursNegatifs > 1 ? "s" : ""} pas utile${retoursNegatifs > 1 ? "s" : ""}`, href: "/admin/osefbot", couleur: "#DC2626" },
  ].filter(Boolean);

  return (
    <div>
      <BandeauPage
        icone="admin"
        titre="Administration"
        sousTitre={employeurRH ? "Collaborateurs et soldes de congés" : "Configuration complète de la plateforme"}
      />
      <AdminNav actif="/admin" employeurRH={employeurRH} estAdmin={estAdmin} />

      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <TuileChiffre valeur={actifs} label="comptes actifs" couleur="#16A34A" href="/admin/utilisateurs?statut=ACTIF" />
        <TuileChiffre valeur={enAttente} label="comptes en attente" couleur={enAttente ? "#9333EA" : "#94A3B8"} href="/admin/utilisateurs?statut=EN_ATTENTE" />
        <TuileChiffre valeur={desactives} label="comptes désactivés" couleur="#94A3B8" href="/admin/utilisateurs?statut=DESACTIVE" />
        <TuileChiffre valeur={demandesEnAttente} label="demandes à valider" couleur={demandesEnAttente ? "#EAB308" : "#16A34A"} href="/employeur#demandes" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((s) => (
              <Link key={s.href} href={s.href} className="group">
                <Card className="flex h-full items-start gap-3.5 p-5 transition-colors group-hover:border-brand-green/50">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/15 text-brand-greendark ring-1 ring-brand-green/30 dark:text-brand-green">
                    <Icone name={s.icone} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-brand-dark">{s.titre}</p>
                      <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-brand-dark/60">{s.valeur}</span>
                    </div>
                    <p className="mt-1 text-xs text-brand-dark/55">{s.desc}</p>
                    <p className="mt-2 text-xs font-semibold text-brand-greendark opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-green">Ouvrir →</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-black/5 px-5 py-4">
              <h2 className="font-bold text-brand-dark">À surveiller</h2>
            </div>
            {aSurveiller.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-brand-dark/50">Rien à traiter pour l’instant 🎉</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {aSurveiller.map((a) => (
                  <li key={a.texte}>
                    <Link href={a.href} className="flex items-center gap-3 px-5 py-3 text-sm text-brand-dark transition-colors hover:bg-black/[0.02]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.couleur }} />
                      <span className="flex-1">{a.texte}</span>
                      <span className="text-brand-dark/35">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!employeurRH && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-black/5 px-5 py-4">
                <h2 className="font-bold text-brand-dark">Dernières actions</h2>
                <Link href="/admin/journal" className="text-xs font-semibold text-brand-greendark hover:underline dark:text-brand-green">
                  Tout voir →
                </Link>
              </div>
              {derniersLogs.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-brand-dark/50">Aucune action enregistrée.</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {derniersLogs.map((l) => (
                    <li key={l.id} className="px-5 py-2.5">
                      <p className="truncate text-xs font-semibold text-brand-dark">{l.action.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</p>
                      <p className="truncate text-[11px] text-brand-dark/45">
                        {l.user ? `${l.user.prenom} ${l.user.nom}` : "Système"} · {formatDateHeure(l.date)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {!employeurRH && (
            <Card className="p-5">
              <h2 className="font-bold text-brand-dark">Outils</h2>
              <dl className="mt-3 space-y-1.5 text-xs text-brand-dark/60">
                <div className="flex justify-between gap-2">
                  <dt>Appareils abonnés aux notifications</dt>
                  <dd className="font-semibold text-brand-dark">{abonnesPush}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Dernier message quotidien</dt>
                  <dd className="font-semibold text-brand-dark">{dernierMessage ? formatDateHeure(dernierMessage.date) : "jamais"}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/api/export-complet?annee=${new Date().getMonth() >= 5 ? new Date().getFullYear() : new Date().getFullYear() - 1}`} className="inline-flex rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-brand-dark hover:bg-black/5">
                  ↓ Export Excel complet
                </a>
              </div>
              <TestPushButton />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
