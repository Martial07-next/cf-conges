import AvatarNoel from "@/components/AvatarNoel";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui";
import BandeauPage, { TuileChiffre } from "@/components/BandeauPage";
import SoldeDemande from "@/components/SoldeDemande";
import { soldesPourDemandes } from "@/lib/soldeDemande";
import { couleurPole } from "@/lib/poles";
import { TypeBadge, Pill } from "@/components/Badges";
import { ValidationActions, CancelRequestActions, AdminDeleteButton, JustificatifButton } from "@/components/RequestActions";
import { UserActivationActions } from "@/components/UserActivationActions";
import ViderHistoriqueRefusButton from "@/components/ViderHistoriqueRefusButton";
import { formatPeriode } from "@/lib/regles";
import VerificationSoldeActions from "@/components/VerificationSoldeActions";
import JoursFeriesAValider from "@/components/JoursFeriesAValider";
import SuiviConges from "@/components/SuiviConges";
import OngletsValidation from "@/components/OngletsValidation";

export const dynamic = "force-dynamic";

export default async function EmployeurPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "employeur")) redirect("/dashboard");

  // Onglet "Suivi des congés" : historique de toutes les demandes.
  if (searchParams?.onglet === "suivi") {
    return (
      <div>
        <BandeauPage icone="validation" titre="Validation & accès" sousTitre="Suivi de toutes les demandes de congé et historique des décisions" />
        <OngletsValidation chemin="/employeur" actif="suivi" />
        <SuiviConges searchParams={searchParams} chemin="/employeur" />
      </div>
    );
  }

  const isAdmin = canAccess(session.user, "admin");

  const [pending, cancelRequests, refuses, verificationsSolde, validesAVenir, waitingAccounts, stats, feriesAValider] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { statut: "EN_ATTENTE" },
      include: { user: true, leaveType: true, piecesJointes: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ exceptionnelle: "desc" }, { createdAt: "asc" }],
    }),
    prisma.leaveRequest.findMany({
      where: { annulationDemandee: true },
      include: { user: true, leaveType: true },
      orderBy: { dateDemandeAnnulation: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { statut: "REFUSE", masqueHistoriqueAdmin: false, leaveType: { demandable: true, code: { not: "ec" } } },
      include: { user: true, leaveType: true, valideur: true },
      orderBy: { dateValidation: "desc" },
      take: 50,
    }),
    prisma.verificationSolde.findMany({
    where: { statut: "EN_ATTENTE" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    }),
    isAdmin
      ? prisma.leaveRequest.findMany({
          where: { statut: "VALIDE", leaveType: { demandable: true, code: { not: "ec" } } },
          include: { user: true, leaveType: true },
          orderBy: { dateDebut: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.user.findMany({ where: { statutCompte: "EN_ATTENTE" }, orderBy: { createdAt: "asc" } }),
        prisma.leaveRequest.groupBy({
      by: ["statut"],
      where: { leaveType: { demandable: true, code: { not: "ec" } }, masqueHistoriqueAdmin: false },
      _count: true,
    }),
      prisma.jourFerieDecision.findMany({
      where: { statut: "EN_ATTENTE", souhaiteTravailler: true },
      include: { user: { select: { prenom: true, nom: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  // Solde de chaque demande en attente (pour valider en connaissance de cause).
  const soldes = await soldesPourDemandes(prisma, pending);
  const aTraiter = pending.length + cancelRequests.length + verificationsSolde.length + waitingAccounts.length + feriesAValider.length;
  const statut = (code) => stats.find((x) => x.statut === code)?._count || 0;

  return (
    <div>
      <BandeauPage
        icone="validation"
        titre="Validation & accès"
        sousTitre={aTraiter ? `${aTraiter} élément${aTraiter > 1 ? "s" : ""} à traiter · demandes, annulations, soldes et accès` : "Tout est traité 🎉 · demandes, annulations, soldes et accès"}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2.5 shadow-card dark:border-white/10 dark:bg-brand-night">
        <OngletsValidation chemin="/employeur" actif="demandes" marge={false} />
        <span className="ml-auto text-xs text-brand-dark/45">
          {statut("VALIDE")} validée{statut("VALIDE") > 1 ? "s" : ""} · {statut("REFUSE")} refusée{statut("REFUSE") > 1 ? "s" : ""} au total
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <TuileChiffre valeur={pending.length} label="demandes à valider" couleur={pending.length ? "#EAB308" : "#16A34A"} href="#demandes" />
        <TuileChiffre valeur={cancelRequests.length} label="annulations demandées" couleur="#F97316" href="#annulations" />
        <TuileChiffre valeur={verificationsSolde.length} label="vérifications de solde" couleur="#2563EB" href="#verifications" />
        <TuileChiffre valeur={waitingAccounts.length} label="comptes en attente" couleur="#9333EA" href="#comptes" />
      </div>

      <Card className="mb-8 scroll-mt-20" id="demandes">
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-6 py-5">
          <div>
            <h2 className="font-bold text-brand-dark">Demandes à traiter</h2>
            <p className="mt-0.5 text-xs text-brand-dark/50">Le solde affiché tient compte des congés déjà validés : il indique si la demande peut être acceptée.</p>
          </div>
          {pending.length > 0 && <Pill tone="yellow">{pending.length} en attente</Pill>}
        </div>
        {pending.length === 0 ? (
          <EmptyState title="Aucune demande en attente" subtitle="Tout est traité 🎉" />
        ) : (
          <ul className="divide-y divide-black/5">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-[#0E1712]"
                    style={{ backgroundColor: couleurPole(r.user.pole) || "#0afe6b" }}
                    aria-hidden
                  >
                    {`${r.user.prenom.charAt(0)}${r.user.nom.charAt(0)}`.toUpperCase()}
                    <AvatarNoel id={r.userId} prenom={r.user.prenom} nom={r.user.nom} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-brand-dark">
                        {r.user.prenom} {r.user.nom}
                      </p>
                      {r.user.pole && <span className="text-xs text-brand-dark/45">{r.user.pole}</span>}
                      {r.exceptionnelle && <Pill tone="yellow">Prioritaire</Pill>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <TypeBadge leaveType={r.leaveType} />
                      <span className="text-xs text-brand-dark/50">{formatPeriode(r.dateDebut, r.dateFin)}{r.demiJournee ? ` · ${r.demiJourneePeriode === "APREM" ? "après-midi" : "matin"}` : ""}</span>
                    </div>
                    {r.motif && <p className="mt-1 text-xs text-brand-dark/50">{r.motif}</p>}
                    <div className="mt-2 max-w-2xl">
                      <SoldeDemande info={soldes.get(r.id)} libelle={r.leaveType.libelle} />
                    </div>
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

      <JoursFeriesAValider decisions={feriesAValider} />

      <Card className="mb-8 scroll-mt-20" id="annulations">
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Modifications des congés</h2>
          <p className="text-xs text-brand-dark/50 mt-0.5">Demandes d'annulation de congés déjà validés, envoyées par les collaborateurs.</p>
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
          
          <Card className="mb-8 scroll-mt-20" id="verifications">
      <div className="px-6 py-5 border-b border-black/5">
      <h2 className="font-bold text-brand-dark">Vérifications de solde demandées</h2>
      </div>
  {verificationsSolde.length === 0 ? (
    <p className="px-6 py-8 text-sm text-brand-dark/50 text-center">Aucune demande en attente.</p>
  ) : (
    <ul className="divide-y divide-black/5">
      {verificationsSolde.map((v) => (
        <li key={v.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-dark">
              {v.user.prenom} {v.user.nom} · N affiché lors du signalement : {v.soldeAffiche} j
            </p>
            {(v.soldeDeclareN !== null || v.soldeDeclareN1 !== null) && (
              <p className="text-xs text-brand-dark/70 mt-1">
                Solde déclaré : N : {v.soldeDeclareN ?? "-"} j · N-1 : {v.soldeDeclareN1 ?? "-"} j
              </p>
            )}
            {v.motif && <p className="text-xs text-brand-dark/50 mt-1">Commentaire : {v.motif}</p>}
          </div>
          <VerificationSoldeActions
            id={v.id}
            userId={v.userId}
            soldeDeclareN={v.soldeDeclareN}
            soldeDeclareN1={v.soldeDeclareN1}
          />
        </li>
      ))}
    </ul>
  )}
</Card>

        <Card className="mb-8">
        <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-brand-dark">Historique des refus</h2>
            <p className="text-xs text-brand-dark/50 mt-0.5">Les 50 dernières demandes que vous (ou un autre employeur/admin) avez refusées.</p>
          </div>
          {isAdmin && refuses.length > 0 && <ViderHistoriqueRefusButton />}
        </div>
        {refuses.length === 0 ? (
          <EmptyState title="Aucun refus" subtitle="Vous n'avez encore refusé aucune demande." />
        ) : (
          <ul className="divide-y divide-black/5">
            {refuses.map((r) => (
              <li key={r.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-dark">
                      {r.user.prenom} {r.user.nom}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <TypeBadge leaveType={r.leaveType} />
                      <span className="text-xs text-brand-dark/50">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                    </div>
                    {r.commentaireRefus && <p className="text-xs text-alert-soft mt-1">Motif : {r.commentaireRefus}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {r.valideur && (
                    <p className="text-xs text-brand-dark/50">
                      par {r.valideur.prenom} {r.valideur.nom}
                    </p>
                  )}
                  {r.dateValidation && (
                    <p className="text-[11px] text-brand-dark/40 mt-0.5">
                      {new Date(r.dateValidation).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isAdmin && (
        <Card className="mb-8">
          <div className="px-6 py-5 border-b border-black/5">
            <h2 className="font-bold text-brand-dark">Tous les congés validés (Admin)</h2>
            <p className="text-xs text-brand-dark/50 mt-0.5">
              Suppression libre, sans limite de délai, le solde du collaborateur est recrédité automatiquement.
            </p>
          </div>
          {validesAVenir.length === 0 ? (
            <EmptyState title="Aucun congé validé" />
          ) : (
            <ul className="divide-y divide-black/5">
              {validesAVenir.map((r) => (
                <li key={r.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-dark">
                        {r.user.prenom} {r.user.nom}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <TypeBadge leaveType={r.leaveType} />
                        <span className="text-xs text-brand-dark/50">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                        {r.annulationDemandee && <Pill tone="yellow">Annulation demandée</Pill>}
                      </div>
                    </div>
                  </div>
                  <AdminDeleteButton requestId={r.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="scroll-mt-20" id="comptes">
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Comptes en attente d'activation</h2>
        </div>
        {waitingAccounts.length === 0 ? (
          <EmptyState title="Aucun compte en attente" />
        ) : (
          <ul className="divide-y divide-black/5">
            {waitingAccounts.map((u) => (
              <li key={u.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-brand-dark">
                    {u.prenom} {u.nom}
                  </p>
                  <p className="text-xs text-brand-dark/50">{u.email}</p>
                </div>
                <UserActivationActions userId={u.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
