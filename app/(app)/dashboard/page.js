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
import SoldeInitialBanner from "@/components/SoldeInitialBanner";
import DemandeVerificationSolde from "@/components/DemandeVerificationSolde";
import { ConfirmerSuppressionAdminButton } from "@/components/RequestActions";
import { formatPeriode } from "@/lib/regles";
import TicketsRestauCard from "@/components/TicketsRestauCard";
import { calculerTicketsMoisUtilisateur } from "@/lib/ticketsRestau";
import { calculerSoldeCP } from "@/lib/moteurConges";
import { periodeAnnee } from "@/lib/campagneConges";
import EquipeEnDirect from "@/components/EquipeEnDirect";

function jourFrance(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const iso = `${values.year}-${values.month}-${values.day}`;
  const debut = new Date(`${iso}T00:00:00.000Z`);
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 1);
  const jours = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

  return { iso, debut, fin, codeJour: jours[debut.getUTCDay()] };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session.user.id;
  const {
    iso: todayISO,
    debut: startOfToday,
    fin: startOfTomorrow,
    codeJour: jourActuel,
  } = jourFrance();
  // Midi UTC évite tout décalage de mois à proximité de minuit.
  const now = new Date(`${todayISO}T12:00:00.000Z`);
  const estPatron = canAccess(session.user, "employeur");

  // Campagne de congés : du 1er juin au 31 mai.
  const year = periodeAnnee(now);

  const previousYear = year - 1;
  
  const [
    soldeCP,
    cpLeaveType,
    balances,
    requests,
    today,
    user,
    ticketsRestauMois,
    livraisonMois,
    demandesAValider,
    equipeTeletravail,
  ] = await Promise.all([
    calculerSoldeCP(prisma, userId, now),
    prisma.leaveType.findUnique({
      where: { code: "CP" },
      select: { code: true, libelle: true, couleur: true },
    }),
    prisma.leaveBalance.findMany({
      where: {
        userId,
        annee: { in: [year, previousYear] },
        leaveType: { comptabiliseSolde: true },
      },
      select: {
        id: true,
        annee: true,
        joursAcquis: true,
        joursPris: true,
        leaveType: {
          select: { code: true, libelle: true, couleur: true, ordre: true },
        },
      },
      orderBy: { leaveType: { ordre: "asc" } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        gereParAlternant: false,
        masqueDashboard: false,
        OR: [
          { creeParAdmin: false },
          { leaveType: { code: { in: ["CP", "RH", "C", "TT"] } } },
        ],
      },
      select: {
        id: true,
        dateDebut: true,
        dateFin: true,
        statut: true,
        supprimeParAdmin: true,
        leaveType: { select: { code: true, libelle: true, couleur: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.leaveRequest.findMany({
      where: {
        statut: "VALIDE",
        dateDebut: { lt: startOfTomorrow },
        dateFin: { gte: startOfToday },
      },
      select: {
        id: true,
        userId: true,
        demiJournee: true,
        demiJourneePeriode: true,
        user: { select: { id: true, prenom: true, nom: true } },
        leaveType: { select: { code: true, libelle: true, couleur: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        prenom: true,
        soldeInitialSaisi: true,
        dateEntree: true,
        accesRepasExterieur: true,
        visiblePlanning: true,
      },
    }),
    calculerTicketsMoisUtilisateur(userId, now.getFullYear(), now.getMonth()),
    prisma.ticketRestauLivraison.findUnique({
      where: {
        annee_mois: {
          annee: now.getFullYear(),
          mois: now.getMonth(),
        },
      },
    }),
    estPatron
      ? prisma.leaveRequest.findMany({
          where: {
            statut: "EN_ATTENTE",
            leaveType: { demandable: true, code: { not: "ec" } },
          },
          select: {
            id: true,
            dateDebut: true,
            dateFin: true,
            exceptionnelle: true,
            user: { select: { prenom: true, nom: true } },
            leaveType: { select: { code: true, libelle: true, couleur: true } },
          },
          orderBy: [{ exceptionnelle: "desc" }, { createdAt: "asc" }],
          take: 5,
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        statutCompte: "ACTIF",
        visiblePlanning: true,
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
        pole: true,
        teletravailAutorise: true,
        teletravailOverrides: {
          where: {
            date: {
              gte: startOfToday,
              lt: startOfTomorrow,
            },
          },
          select: { type: true },
        },
        teletravailJoursFixes: {
          where: {
            dateDebut: { lte: startOfToday },
            OR: [
              { dateFin: null },
              { dateFin: { gte: startOfToday } },
            ],
          },
          select: { jour: true },
        },
      },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    }),
  ]);

  // Une demande TT validée doit figurer dans le dashboard. Auparavant, ce
  // bloc ne regardait que les jours fixes et les exceptions de profil : un TT
  // validé apparaissait donc dans le planning mais pas ici.
  const demandesTeletravail = today.filter((r) => r.leaveType.code === "TT");
  const utilisateursAvecDemandeTT = new Set(
    demandesTeletravail.map((r) => r.userId)
  );

  // Toute autre demande validée est une absence et prime sur un jour fixe TT.
  const absencesReelles = today.filter((r) => r.leaveType.code !== "TT");
  const userIdsAbsents = new Set(absencesReelles.map((r) => r.userId));

  const teletravailleursParId = new Map();

  // Les demandes TT peuvent être à la demi-journée : on conserve le créneau
  // afin de l'afficher dans la carte.
  for (const demande of demandesTeletravail) {
    teletravailleursParId.set(demande.userId, {
      user: demande.user,
      demiJournee: demande.demiJournee,
      demiJourneePeriode: demande.demiJourneePeriode,
    });
  }

  for (const user of equipeTeletravail) {
    const override = user.teletravailOverrides?.[0];

    if (
      userIdsAbsents.has(user.id) ||
      utilisateursAvecDemandeTT.has(user.id) ||
      override?.type === "RETRAIT"
    ) {
      continue;
    }

    const estEnTeletravail =
      override?.type === "AJOUT" ||
      (user.teletravailAutorise &&
        user.teletravailJoursFixes.some(
          (jourFixe) => jourFixe.jour === jourActuel
        ));

    if (estEnTeletravail) {
      teletravailleursParId.set(user.id, { user });
    }
  }

  const teletravailleurs = [...teletravailleursParId.values()];
  const equipeEnDirect = equipeTeletravail.map((membre) => {
    const demande = today.find((r) => r.userId === membre.id) || null;
    const override = membre.teletravailOverrides?.[0];
    const ttFixe =
      !demande &&
      (override?.type === "AJOUT" ||
        (override?.type !== "RETRAIT" &&
          membre.teletravailAutorise &&
          membre.teletravailJoursFixes.some((jourFixe) => jourFixe.jour === jourActuel)));

    return {
      id: membre.id,
      nom: `${membre.prenom} ${membre.nom}`,
      pole: membre.pole || null,
      teletravail: !!ttFixe,
      request: demande
        ? {
            demiJournee: demande.demiJournee,
            demiJourneePeriode: demande.demiJourneePeriode,
            leaveType: {
              code: demande.leaveType.code,
              libelle: demande.leaveType.libelle,
              couleur: demande.leaveType.couleur,
            },
          }
        : null,
    };
  });


  // Conserve les cartes habituelles de la campagne N, puis ajoute CP N-1.
  // CP N et N-1 viennent désormais du moteur de calcul (lib/moteurConges.js) ;
  // les autres types (RH, etc.) continuent de lire LeaveBalance directement.
  const balancesCurrentYear = balances.filter(
    (b) => b.annee === year && b.leaveType.code !== "CP"
  );
  const aUnSoldeCP = soldeCP.acquis > 0 || soldeCP.n1.acquis > 0;

  const pendingCount = requests.filter(
    (r) => r.statut === "EN_ATTENTE"
  ).length;

  // N-1 correspond à la campagne du 1er juin de l'année précédente
  // au 31 mai de l'année courante. Le champ N-1 n'a de sens que si
  // le collaborateur était déjà présent avant la fin de cette campagne.
  const finCampagneN1 = new Date(year, 4, 31, 23, 59, 59, 999);
  const aDroitsN1 = !!user.dateEntree && new Date(user.dateEntree) <= finCampagneN1;

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

      <div className="mb-6">
        <EquipeEnDirect personnes={equipeEnDirect} dateLabel={todayISO} />
      </div>

      {!user.soldeInitialSaisi && (
        <SoldeInitialBanner dateEntreeInitiale={user.dateEntree} />
      )}
      {user.accesRepasExterieur && <RepasExterieurButton />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {balancesCurrentYear.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: b.leaveType.couleur }}
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                {b.leaveType.libelle}
                {b.leaveType.code === "CP" ? " N" : ""}
              </p>
            </div>
            <Link href="/mon-solde" className="text-xs font-semibold text-brand-greendark hover:underline block mt-2">Voir le détail de mon solde →</Link>
            <p className="text-3xl font-bold text-brand-dark">
              {Math.max(0, b.joursAcquis - b.joursPris)}
              <span className="text-sm font-medium text-brand-dark/40">
                {" "}
                / {b.joursAcquis} j
              </span>
            </p>
            <p className="text-xs text-brand-dark/50 mt-1">
              {b.joursPris} jours déjà pris cette année
            </p>
          </Card>
        ))}

               {soldeCP.acquis > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: cpLeaveType?.couleur || "#6CB64D" }}
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                {cpLeaveType?.libelle || "Congé payé"} N
              </p>
            </div>
            <p className="text-3xl font-bold text-brand-dark">
              {soldeCP.disponible}
              <span className="text-sm font-medium text-brand-dark/40">
                {" "}
                / {soldeCP.acquis} j
              </span>
            </p>
            <p className="text-xs text-brand-dark/50 mt-1">
              {soldeCP.pris} jours déjà pris cette année
            </p>
            <DemandeVerificationSolde
              soldeAfficheN={soldeCP.disponible}
              soldeAfficheN1={soldeCP.n1.disponible}
              aDroitsN1={aDroitsN1}
            />
                <p className="text-[11px] text-brand-dark/40 mt-1.5 italic">
  Vérifiez votre dernière fiche de paie, le calcul se fait jour par jour (+0,11) et peut parfois contenir une erreur.
</p>
          </Card>
        )}

        {soldeCP.n1.acquis > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: cpLeaveType?.couleur || "#6CB64D" }}
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                {cpLeaveType?.libelle || "Congé payé"} N-1
              </p>
            </div>
            <p className="text-3xl font-bold text-brand-dark">
              {soldeCP.n1.disponible}
              <span className="text-sm font-medium text-brand-dark/40">
                {" "}
                / {soldeCP.n1.acquis} j
              </span>
            </p>
            <p className="text-xs text-brand-dark/50 mt-1">
              {soldeCP.n1.pris} jours déjà pris sur la campagne N-1
            </p>
          </Card>
        )}

        {user.visiblePlanning && (
          <TicketsRestauCard
            nombre={ticketsRestauMois}
            moisLabel={now.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
            livreLe={livraisonMois?.livreLe || null}
          />
        )}

        {balancesCurrentYear.length === 0 && !aUnSoldeCP && (
          <Card className="p-5 col-span-full">
            <p className="text-sm text-brand-dark/60">
              Aucun solde initialisé pour {year}. Contactez l'administrateur.
            </p>
          </Card>
        )}
      </div>

      {estPatron && (
        <Card className="mb-8">
          <div className="px-4 sm:px-6 py-5 border-b border-black/5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-brand-dark">
              Demandes de congés à valider
            </h2>
            {demandesAValider.length > 0 && (
              <span className="text-xs font-semibold text-brand-dark bg-brand-yellow/40 px-2.5 py-1 rounded-full">
                {demandesAValider.length} en attente
              </span>
            )}
          </div>

          {demandesAValider.length === 0 ? (
            <EmptyState
              title="Aucune demande en attente"
              subtitle="Tout est traité 🎉"
            />
          ) : (
            <ul className="divide-y divide-black/5">
              {demandesAValider.map((r) => (
                <li
                  key={r.id}
                  className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {r.exceptionnelle && <Pill tone="yellow">Prioritaire</Pill>}
                    <span className="text-sm font-medium text-brand-dark truncate">
                      {r.user.prenom} {r.user.nom}
                    </span>
                    <TypeBadge leaveType={r.leaveType} />
                    <span className="text-xs text-brand-dark/50 truncate">
                      {formatPeriode(r.dateDebut, r.dateFin)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="px-6 py-4 border-t border-black/5">
            <Link
              href="/employeur"
              className="text-sm font-semibold text-brand-greendark hover:underline"
            >
              Traiter les demandes →
            </Link>
          </div>
        </Card>
      )}

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="min-w-0 max-w-full overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
            <h2 className="font-bold text-brand-dark">
              Mes dernières demandes
            </h2>
            {pendingCount > 0 && (
              <span className="text-xs font-semibold text-brand-dark bg-brand-yellow/40 px-2.5 py-1 rounded-full">
                {pendingCount} en attente
              </span>
            )}
          </div>

          {requests.length === 0 ? (
            <EmptyState
              title="Aucune demande pour le moment"
              subtitle="Faites votre première demande de congé en 3 clics."
            />
          ) : (
            <ul className="divide-y divide-black/5">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="px-4 sm:px-6 py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TypeBadge leaveType={r.leaveType} />
                    <span className="text-sm text-brand-dark/70 truncate">
                      {formatPeriode(r.dateDebut, r.dateFin)}
                    </span>
                    {r.supprimeParAdmin && (
                      <Pill tone="yellow">Supprimé par l'admin</Pill>
                    )}
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
            <Link
              href="/mes-demandes"
              className="text-sm font-semibold text-brand-greendark hover:underline"
            >
              Voir tout l'historique →
            </Link>
          </div>
        </Card>

        <Card className="min-w-0 max-w-full overflow-hidden">
          <div className="px-4 sm:px-6 py-5 border-b border-black/5">
            <h2 className="font-bold text-brand-dark">Absents aujourd'hui</h2>
          </div>

          {absencesReelles.length === 0 ? (
            <EmptyState title="Toute l'équipe est présente" />
          ) : (
            <ul className="divide-y divide-black/5">
              {absencesReelles.map((r) => (
                <li
                  key={r.id}
                  className="px-4 sm:px-6 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 min-w-0"
                >
                  <span className="text-sm text-brand-dark truncate">
                    {r.user.prenom} {r.user.nom}
                  </span>
                  <TypeBadge leaveType={r.leaveType} />
                </li>
              ))}
            </ul>
          )}

          <div className="px-6 py-4 border-t border-black/5">
            <Link
              href="/planning"
              className="text-sm font-semibold text-brand-greendark hover:underline"
            >
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
              {teletravailleurs.map((teletravail) => (
                <li
                  key={teletravail.user.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-brand-dark truncate">
                    {teletravail.user.prenom} {teletravail.user.nom}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-green/15 text-brand-greendark">
                    <span className="w-2 h-2 rounded-full bg-brand-green" />
                    Télétravail
                    {teletravail.demiJournee &&
                      ` — ${
                        teletravail.demiJourneePeriode === "MATIN"
                          ? "matin"
                          : "après-midi"
                      }`}
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
