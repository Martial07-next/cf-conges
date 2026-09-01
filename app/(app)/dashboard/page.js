import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import JourFeriePopup from "@/components/JourFeriePopup";
import TRLivraisonPopup from "@/components/TRLivraisonPopup";
import RepasExterieurButton from "@/components/RepasExterieurButton";
import { PageHeader, Card, Button, EmptyState } from "@/components/ui";
import { StatusBadge, TypeBadge, Pill } from "@/components/Badges";
import { ConfirmerSuppressionAdminButton } from "@/components/RequestActions";
import { formatPeriode } from "@/lib/regles";
import SoldeInitialBanner from "@/components/SoldeInitialBanner";

import TicketsRestauCard from "@/components/TicketsRestauCard";
import { calculerTicketsMoisUtilisateur } from "@/lib/ticketsRestau";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session.user.id;
  const now = new Date();
  const estPatron = canAccess(session.user, "employeur");

const year =
  now.getMonth() + 1 >= 5
    ? now.getFullYear()
    : now.getFullYear() - 1;

  const [balances, requests, today, user, ticketsRestauMois, livraisonMois, demandesAValider, equipeTeletravail] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { userId, annee: year, leaveType: { comptabiliseSolde: true } },
      include: { leaveType: true },
      orderBy: { leaveType: { ordre: "asc" } },
    }),
    prisma.leaveRequest.findMany({
    where: {
      userId,
      gereParAlternant: false,
      masqueDashboard: false,
      OR: [{ creeParAdmin: false }, { leaveType: { code: { in: ["CP", "RH", "C", "TT"] } } }],
    },
    include: { leaveType: true },
    orderBy: { createdAt: "desc" },
    take: 5,
    }),
    prisma.leaveRequest.findMany({
      where: {
        statut: "VALIDE",
        dateDebut: { lte: new Date() },
        dateFin: { gte: new Date(new Date().toDateString()) },
      },
      include: { user: true, leaveType: true },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
    calculerTicketsMoisUtilisateur(userId, now.getFullYear(), now.getMonth()),
    prisma.ticketRestauLivraison.findUnique({
      where: { annee_mois: { annee: now.getFullYear(), mois: now.getMonth() } },
    }),
    estPatron
      ? prisma.leaveRequest.findMany({
          where: { statut: "EN_ATTENTE", leaveType: { demandable: true, code: { not: "ec" } } },
          include: { user: true, leaveType: true },
          orderBy: [{ exceptionnelle: "desc" }, { createdAt: "asc" }],
          take: 5,
        })
      : Promise.resolve([]),
    prisma.user.findMany({
  where: {
    statutCompte: "ACTIF",
    visiblePlanning: true,
  },
  include: {
    teletravailOverrides: {
      where: {
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
      },
    },
  },
  orderBy: [{ ordre: "asc" }, { nom: "asc" }],
}),
  ]);
  
const JOURS_CODE = [
  "DIMANCHE",
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
];

const jourActuel = JOURS_CODE[now.getDay()];

const teletravailleurs = equipeTeletravail.filter((u) => {
  const override = u.teletravailOverrides?.[0];

  // Un retrait exceptionnel annule le télétravail habituel.
  if (override?.type === "RETRAIT") {
    return false;
  }

  // Un ajout exceptionnel active le télétravail.
  if (override?.type === "AJOUT") {
    return true;
  }

  // Sinon on regarde le jour habituel.
  return (
    u.teletravailAutorise &&
    Array.isArray(u.teletravailJours) &&
    u.teletravailJours.includes(jourActuel)
  );
});
  
  const pendingCount = requests.filter((r) => r.statut === "EN_ATTENTE").length;

  return (
    <div>
    <JourFeriePopup />
    <TRLivraisonPopup />
      <PageHeader
        title={`Bonjour ${user.prenom} 👋`}
        subtitle="Votre solde de congés et l'activité récente de votre équipe."
        action={
          <Link href="/demande">
            <Button>+ Nouvelle demande</Button>
          </Link>
        }
      />
        {!user.soldeInitialSaisi && <SoldeInitialBanner
  dateEntreeInitiale={user.dateEntree}
/>}

  {user.accesRepasExterieur && <RepasExterieurButton />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {balances.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.leaveType.couleur }} />
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/60">{b.leaveType.libelle}</p>
            </div>
            <p className="text-3xl font-bold text-brand-dark">
              {Math.max(0, b.joursAcquis - b.joursPris)}
              <span className="text-sm font-medium text-brand-dark/40"> / {b.joursAcquis} j</span>
            </p>
            <p className="text-xs text-brand-dark/50 mt-1">{b.joursPris} jours déjà pris cette année</p>
          </Card>
        ))}
        {user.visiblePlanning && (
          <TicketsRestauCard
            nombre={ticketsRestauMois}
            moisLabel={now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            livreLe={livraisonMois?.livreLe || null}
          />
        )}
        {balances.length === 0 && (
          <Card className="p-5 col-span-full">
            <p className="text-sm text-brand-dark/60">Aucun solde initialisé pour {year}. Contactez l'administrateur.</p>
          </Card>
        )}
      </div>

      {estPatron && (
        <Card className="mb-8">
          <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
            <h2 className="font-bold text-brand-dark">Demandes de congés à valider</h2>
            {demandesAValider.length > 0 && (
              <span className="text-xs font-semibold text-brand-dark bg-brand-yellow/40 px-2.5 py-1 rounded-full">
                {demandesAValider.length} en attente
              </span>
            )}
          </div>
          {demandesAValider.length === 0 ? (
            <EmptyState title="Aucune demande en attente" subtitle="Tout est traité 🎉" />
          ) : (
            <ul className="divide-y divide-black/5">
              {demandesAValider.map((r) => (
                <li key={r.id} className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.exceptionnelle && <Pill tone="yellow">Prioritaire</Pill>}
                    <span className="text-sm font-medium text-brand-dark truncate">
                      {r.user.prenom} {r.user.nom}
                    </span>
                    <TypeBadge leaveType={r.leaveType} />
                    <span className="text-xs text-brand-dark/50 truncate">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="px-6 py-4 border-t border-black/5">
            <Link href="/employeur" className="text-sm font-semibold text-brand-greendark hover:underline">
              Traiter les demandes →
            </Link>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
            <h2 className="font-bold text-brand-dark">Mes dernières demandes</h2>
            {pendingCount > 0 && (
              <span className="text-xs font-semibold text-brand-dark bg-brand-yellow/40 px-2.5 py-1 rounded-full">
                {pendingCount} en attente
              </span>
            )}
          </div>
          {requests.length === 0 ? (
            <EmptyState title="Aucune demande pour le moment" subtitle="Faites votre première demande de congé en 3 clics." />
          ) : (
            <ul className="divide-y divide-black/5">
              {requests.map((r) => (
                <li key={r.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <TypeBadge leaveType={r.leaveType} />
                    <span className="text-sm text-brand-dark/70 truncate">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                    {r.supprimeParAdmin && <Pill tone="yellow">Supprimé par l'admin</Pill>}
                  </div>
                  {r.supprimeParAdmin ? (
                    <ConfirmerSuppressionAdminButton requestId={r.id} />
                  ) : (
                    <StatusBadge statut={r.statut} />
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="px-6 py-4 border-t border-black/5">
            <Link href="/mes-demandes" className="text-sm font-semibold text-brand-greendark hover:underline">
              Voir tout l'historique →
            </Link>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-5 border-b border-black/5">
            <h2 className="font-bold text-brand-dark">Absents aujourd'hui</h2>
          </div>
          {today.length === 0 ? (
            <EmptyState title="Toute l'équipe est présente" />
          ) : (
            <ul className="divide-y divide-black/5">
              {today.map((r) => (
                <li key={r.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-brand-dark truncate">
                    {r.user.prenom} {r.user.nom}
                  </span>
                  <TypeBadge leaveType={r.leaveType} />
                </li>
              ))}
            </ul>
          )}
          <div className="px-6 py-4 border-t border-black/5">
            <Link href="/planning" className="text-sm font-semibold text-brand-greendark hover:underline">
              Voir le planning complet →
            </Link>
          </div>
        </Card>
            {teletravailleurs.length > 0 && (
  <Card>
    <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
      <h2 className="font-bold text-brand-dark">
        Télétravail aujourd'hui
      </h2>

      <span className="text-xs font-semibold text-brand-dark bg-brand-green/15 px-2.5 py-1 rounded-full">
        {teletravailleurs.length}
      </span>
    </div>

    <ul className="divide-y divide-black/5">
      {teletravailleurs.map((u) => (
        <li
          key={u.id}
          className="px-6 py-3.5 flex items-center justify-between gap-3"
        >
          <span className="text-sm text-brand-dark truncate">
            {u.prenom} {u.nom}
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-green/15 text-brand-greendark">
            <span className="w-2 h-2 rounded-full bg-brand-green" />
            Télétravail
          </span>
        </li>
      ))}
    </ul>

    <div className="px-6 py-4 border-t border-black/5">
      <Link
        href="/planning?vue=jour"
        className="text-sm font-semibold text-brand-greendark hover:underline"
      >
        Voir le planning →
      </Link>
    </div>
  </Card>
)}
      </div>
    </div>
  );
}
