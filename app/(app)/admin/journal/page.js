import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui";
import BandeauPage from "@/components/BandeauPage";
import AdminNav from "@/components/AdminNav";
import ClearAllButton from "@/components/ClearAllButton";

export const dynamic = "force-dynamic";

// Familles d'actions (préfixes des codes enregistrés par logAudit), avec
// leur couleur dans le journal.
const FAMILLES = [
  { cle: "conges", label: "Congés", couleur: "#16A34A", match: (a) => /CONGE|DEMANDE|ANNULATION|SOLDE|VERIFICATION/.test(a) && !/TYPE_CONGE/.test(a) },
  { cle: "comptes", label: "Comptes", couleur: "#2563EB", match: (a) => /UTILISATEUR|PROFIL|MOT_DE_PASSE|INSCRIPTION|CONNEXION|COMPTE/.test(a) },
  { cle: "tickets", label: "Tickets restaurant", couleur: "#EAB308", match: (a) => /^TR_|REPAS|TICKET/.test(a) },
  { cle: "feries", label: "Jours fériés", couleur: "#F97316", match: (a) => /FERIE/.test(a) },
  { cle: "config", label: "Configuration", couleur: "#9333EA", match: (a) => /TYPE_CONGE|MOTIF|LIEN_UTILE/.test(a) },
  { cle: "systeme", label: "Système", couleur: "#64748B", match: (a) => /MESSAGE|ANNIV|NOTIFICATION|EMAIL|EXPORT|CRON|ACCRUAL/.test(a) },
];
const famille = (action) => FAMILLES.find((f) => f.match(action)) || { cle: "autre", label: "Autre", couleur: "#94A3B8" };
const PERIODES = { "7": 7, "30": 30, "90": 90 };

function libelleAction(action) {
  const t = action.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default async function JournalPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const filtreFamille = FAMILLES.some((f) => f.cle === searchParams?.famille) ? searchParams.famille : "";
  const periode = PERIODES[searchParams?.periode] ? searchParams.periode : "";
  const recherche = (searchParams?.q || "").trim();

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(periode ? { date: { gte: new Date(Date.now() - PERIODES[periode] * 86400000) } } : {}),
      ...(recherche
        ? {
            OR: [
              { cible: { contains: recherche, mode: "insensitive" } },
              { action: { contains: recherche.replace(/\s+/g, "_"), mode: "insensitive" } },
              { user: { OR: [{ prenom: { contains: recherche, mode: "insensitive" } }, { nom: { contains: recherche, mode: "insensitive" } }] } },
            ],
          }
        : {}),
    },
    include: { user: { select: { prenom: true, nom: true } } },
    orderBy: { date: "desc" },
    take: 500,
  });
  const filtres = (filtreFamille ? logs.filter((l) => famille(l.action).cle === filtreFamille) : logs).slice(0, 300);

  // Regroupement par jour (heure de Paris).
  const jour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const groupes = [];
  for (const l of filtres) {
    const cle = jour.format(l.date);
    if (!groupes.length || groupes[groupes.length - 1].cle !== cle) groupes.push({ cle, lignes: [] });
    groupes[groupes.length - 1].lignes.push(l);
  }

  const lien = (changes) => {
    const params = new URLSearchParams();
    const valeurs = { famille: filtreFamille, periode, q: recherche, ...changes };
    for (const [k, v] of Object.entries(valeurs)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/admin/journal${qs ? `?${qs}` : ""}`;
  };
  const puce = (actif) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
      actif ? "border-brand-dark bg-brand-dark text-brand-cream dark:border-brand-green dark:bg-brand-green dark:text-[#16231a]" : "border-black/10 text-brand-dark/70 hover:bg-black/5 dark:border-white/10"
    }`;

  return (
    <div>
      <BandeauPage icone="journal" titre="Journal d’audit" sousTitre="Traçabilité complète : qui a fait quoi, et quand">
        {logs.length > 0 && (
          <ClearAllButton endpoint="/api/audit-log" label="Vider le journal" confirmMessage="Supprimer définitivement tout le journal d'audit ?" sombre />
        )}
      </BandeauPage>
      <AdminNav actif="/admin/journal" estAdmin={session.user.role === "ADMIN"} />

      <Card className="mb-4 space-y-3 p-4">
        <form action="/admin/journal" className="flex flex-wrap items-center gap-2">
          {filtreFamille && <input type="hidden" name="famille" value={filtreFamille} />}
          {periode && <input type="hidden" name="periode" value={periode} />}
          <input
            type="search"
            name="q"
            defaultValue={recherche}
            placeholder="Rechercher une personne, une action, un détail…"
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-brand-cream/50 px-3 py-2 text-sm text-brand-dark outline-none focus-ring dark:border-white/10 dark:bg-white/5"
          />
          <button type="submit" className="rounded-xl bg-brand-night px-3.5 py-2 text-xs font-bold text-brand-cream hover:opacity-90">
            Rechercher
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={lien({ famille: "" })} className={puce(!filtreFamille)}>
            Toutes les actions
          </Link>
          {FAMILLES.map((f) => (
            <Link key={f.cle} href={lien({ famille: f.cle })} className={puce(filtreFamille === f.cle)}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.couleur }} />
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[["", "Tout"], ["7", "7 derniers jours"], ["30", "30 jours"], ["90", "3 mois"]].map(([v, l]) => (
            <Link key={v || "tout"} href={lien({ periode: v })} className={puce(periode === v)}>
              {l}
            </Link>
          ))}
          <span className="ml-auto text-xs text-brand-dark/45">
            {filtres.length} entrée{filtres.length > 1 ? "s" : ""}
          </span>
        </div>
      </Card>

      {groupes.length === 0 ? (
        <Card>
          <EmptyState title="Aucune entrée" subtitle={recherche || filtreFamille || periode ? "Aucune action ne correspond à ces filtres." : "Le journal est vide pour le moment."} />
        </Card>
      ) : (
        <div className="space-y-4">
          {groupes.map((g) => (
            <Card key={g.cle} className="overflow-hidden">
              <div className="border-b border-black/5 bg-black/[0.015] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-brand-dark/50">{g.cle}</div>
              <ul className="divide-y divide-black/5">
                {g.lignes.map((l) => {
                  const f = famille(l.action);
                  return (
                    <li key={l.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.couleur }} title={f.label} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold text-brand-dark">{libelleAction(l.action)}</span>
                          <span className="text-xs text-brand-dark/50">par {l.user ? `${l.user.prenom} ${l.user.nom}` : "le système"}</span>
                        </div>
                        {l.cible && <p className="mt-0.5 break-words text-xs text-brand-dark/60">{l.cible}</p>}
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-brand-dark/40">{heure.format(l.date)}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
