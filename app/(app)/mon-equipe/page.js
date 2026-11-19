import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { estCadre } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui";
import BandeauPage, { TuileChiffre } from "@/components/BandeauPage";
import SoldeDemande from "@/components/SoldeDemande";
import { soldesPourDemandes } from "@/lib/soldeDemande";
import { couleurPole } from "@/lib/poles";
import { TypeBadge, Pill } from "@/components/Badges";
import { ValidationActions, CancelRequestActions, JustificatifButton } from "@/components/RequestActions";
import { formatPeriode } from "@/lib/regles";
import JoursFeriesAValider from "@/components/JoursFeriesAValider";
import SuiviConges from "@/components/SuiviConges";
import OngletsValidation from "@/components/OngletsValidation";

export const dynamic = "force-dynamic";

// Espace du Cadre : référent d'un pôle, il traite les demandes de congé des
// collaborateurs de son pôle (jamais les siennes, validées par l'Employeur /
// RH ou l'administrateur).
export default async function MonEquipePage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!estCadre(session?.user)) redirect("/dashboard");

  const pole = session.user.pole;

  // Onglet "Suivi des congés" : historique des demandes du pôle.
  if (searchParams?.onglet === "suivi") {
    return (
      <div>
        <BandeauPage icone="equipe" titre="Mon équipe" sousTitre={`Suivi des congés du pôle ${pole}`} />
        <OngletsValidation chemin="/mon-equipe" actif="suivi" labelDemandes="Demandes" />
        <SuiviConges searchParams={searchParams} chemin="/mon-equipe" poleImpose={pole} />
      </div>
    );
  }
  const equipe = { user: { pole }, userId: { not: session.user.id } };

  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);

  const [pending, cancelRequests, aVenir, membres, feriesAValider] = await Promise.all([
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
    prisma.jourFerieDecision.findMany({
      where: { ...equipe, statut: "EN_ATTENTE", souhaiteTravailler: true },
      include: { user: { select: { prenom: true, nom: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  // Solde de chaque demande en attente (pour valider en connaissance de cause).
  const soldes = await soldesPourDemandes(prisma, pending);

  return (
    <div>
      <BandeauPage icone="equipe" titre="Mon équipe" sousTitre={`Pôle ${pole} · ${membres} collaborateur${membres > 1 ? "s" : ""}`} />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2.5 shadow-card dark:border-white/10 dark:bg-brand-night">
        <OngletsValidation chemin="/mon-equipe" actif="demandes" labelDemandes="Demandes" marge={false} />
      </div>
      <div className="mb-6 grid grid-cols-3 gap-2.5">
        <TuileChiffre valeur={pending.length} label="demandes à valider" couleur={pending.length ? "#EAB308" : "#16A34A"} />
        <TuileChiffre valeur={cancelRequests.length} label="annulations demandées" couleur="#F97316" />
        <TuileChiffre valeur={aVenir.length} label="congés à venir" couleur="#2563EB" />
      </div>

      <Card className="mb-8">
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
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#0E1712]"
                    style={{ backgroundColor: couleurPole(r.user.pole) || "#0afe6b" }}
                    aria-hidden
                  >
                    {`${r.user.prenom.charAt(0)}${r.user.nom.charAt(0)}`.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-brand-dark">
                        {r.user.prenom} {r.user.nom}
                      </p>
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
