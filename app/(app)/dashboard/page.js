import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess, estCadre } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import JourFeriePopup from "@/components/JourFeriePopup";
import JourFerieDirectionPopup from "@/components/JourFerieDirectionPopup";
import TRLivraisonPopup from "@/components/TRLivraisonPopup";
import RepasExterieurButton from "@/components/RepasExterieurButton";
import { StatusBadge, TypeBadge, Pill } from "@/components/Badges";
import SoldeInitialBanner from "@/components/SoldeInitialBanner";
import DemandeVerificationSolde from "@/components/DemandeVerificationSolde";
import { ConfirmerSuppressionAdminButton } from "@/components/RequestActions";
import { formatPeriode } from "@/lib/regles";
import { SoldeCard, WidgetCard, Avatar, Vide } from "@/components/espace/EspaceCards";
import { calculerTicketsMoisUtilisateur } from "@/lib/ticketsRestau";
import { calculerSoldeCP } from "@/lib/moteurConges";
import { periodeAnnee } from "@/lib/campagneConges";
import EquipeEnDirect from "@/components/EquipeEnDirect";
import { formationsDuJour, formationsDe } from "@/lib/planningFormations";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import DashboardHero from "@/components/DashboardHero";
import LiensUtiles from "@/components/LiensUtiles";
import AnniversairePopup from "@/components/AnniversairePopup";
import DateNaissancePopup from "@/components/DateNaissancePopup";
import { estAnniversaireLe } from "@/lib/anniversaires";
import { indexerEvenements, creneauxDuJour, PERIODES, STATUTS_AGENDA } from "@/lib/agendaDirection";

// Statuts de l'agenda Direction qui comptent comme "absent" du bureau.
const STATUTS_ABSENCE_AGENDA = ["ABSENT", "DEPLACEMENT"];
import DashboardLayoutManager from "@/components/DashboardLayoutManager";

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
  // Le Cadre voit les demandes en attente de son pôle (hors les siennes).
  const estCadreEquipe = !estPatron && estCadre(session.user);
  // Les comptes Employeur / RH ne cumulent pas de congés et ne posent pas de
  // demande : pas de soldes CP N / N-1, ni de "Nouvelle demande" pour eux.
  const estEmployeur = session.user.role === "EMPLOYEUR";

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
    formationsPlanning,
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
        doitChangerMotDePasse: true,
        dateNaissance: true,
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
    estPatron || estCadreEquipe
      ? prisma.leaveRequest.findMany({
          where: {
            statut: "EN_ATTENTE",
            leaveType: { demandable: true, code: { not: "ec" } },
            ...(estCadreEquipe ? { user: { pole: session.user.pole }, userId: { not: userId } } : {}),
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
        // Employeurs / RH et pôle Direction : toujours visibles (présents par
        // défaut), même s'ils sont masqués du planning.
        OR: [{ visiblePlanning: true }, { role: "EMPLOYEUR" }, { pole: "Direction" }],
      },
      select: {
        id: true,
        agendaEvenements: {
          where: { dateDebut: { lte: startOfToday }, dateFin: { gte: startOfToday } },
          select: { userId: true, dateDebut: true, dateFin: true, demiJournee: true, periode: true, statut: true, lieu: true, note: true, createdAt: true },
        },
        email: true,
        prenom: true,
        nom: true,
        pole: true,
        dateNaissance: true,
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
    // Formateurs en formation aujourd'hui (planning CF Formations).
    formationsDuJour(),
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

  // Une seule ligne par personne dans "Absents aujourd'hui", même si
  // plusieurs demandes se chevauchent (ex. deux périodes École, ou un matin
  // et un après-midi), avec chaque type d'absence affiché une seule fois.
  const absentsParPersonne = new Map();
  for (const r of absencesReelles) {
    const absent = absentsParPersonne.get(r.userId) || { user: r.user, leaveTypes: [] };
    if (!absent.leaveTypes.some((t) => t.code === r.leaveType.code)) absent.leaveTypes.push(r.leaveType);
    absentsParPersonne.set(r.userId, absent);
  }
  // Agenda Direction : absent ou en déplacement aujourd'hui (journée entière,
  // ou demi-journée précisée).
  for (const membre of equipeTeletravail) {
    const creneaux = creneauxDuJour(indexerEvenements(membre.agendaEvenements), membre.id, todayISO);
    if (!creneaux) continue;
    const absences = PERIODES.map((p) => ({ periode: p, creneau: creneaux[p.valeur] }))
      .filter(({ creneau }) => creneau && STATUTS_ABSENCE_AGENDA.includes(creneau.statut));
    if (absences.length === 0) continue;
    const journee =
      absences.length === 2 && absences[0].creneau.statut === absences[1].creneau.statut && absences[0].creneau.lieu === absences[1].creneau.lieu;
    const absent = absentsParPersonne.get(membre.id) || { user: { id: membre.id, prenom: membre.prenom, nom: membre.nom }, leaveTypes: [] };
    for (const { periode, creneau } of journee ? absences.slice(0, 1) : absences) {
      const st = STATUTS_AGENDA[creneau.statut];
      const libelle = `${st.label}${creneau.lieu ? ` · ${creneau.lieu}` : ""}${journee ? "" : ` (${periode.label.toLowerCase()})`}`;
      absent.leaveTypes.push({ code: `${creneau.statut}_${periode.valeur}`, libelle, couleur: st.couleur });
    }
    absentsParPersonne.set(membre.id, absent);
  }
  const absentsAujourdhui = [...absentsParPersonne.values()];

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
      anniversaire: estAnniversaireLe(membre.dateNaissance, todayISO),
      // Exceptions saisies dans « Mon agenda » (Employeurs / RH, Direction).
      agenda: creneauxDuJour(indexerEvenements(membre.agendaEvenements), membre.id, todayISO),
      teletravail: !!ttFixe,
      // Formations animées aujourd'hui (rapprochement par e-mail ou prénom + nom).
      formations: formationsDe(formationsPlanning, membre),
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
    (b) =>
      b.annee === year &&
      b.leaveType.code !== "CP" &&
      Math.max(0, b.joursAcquis - b.joursPris) > 0
  );
  const aUnSoldeCP = soldeCP.disponible > 0 || soldeCP.n1.disponible > 0;

  const pendingCount = requests.filter(
    (r) => r.statut === "EN_ATTENTE"
  ).length;

  // N-1 correspond à la campagne du 1er juin de l'année précédente
  // au 31 mai de l'année courante. Le champ N-1 n'a de sens que si
  // le collaborateur était déjà présent avant la fin de cette campagne.
  const finCampagneN1 = new Date(year, 4, 31, 23, 59, 59, 999);
  const aDroitsN1 = !!user.dateEntree && new Date(user.dateEntree) <= finCampagneN1;

  // Repas à l'extérieur : masqué le week-end, état du jour déjà signalé.
  const jourServeur = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const estWeekEnd = jourServeur.getDay() === 0 || jourServeur.getDay() === 6;
  const regularisationDuJour =
    user.accesRepasExterieur && !estEmployeur && !estWeekEnd
      ? await prisma.ticketRestauRegularisation.findUnique({ where: { userId_date: { userId, date: jourServeur } }, select: { createdById: true } })
      : null;

  // Chiffres clés du bandeau d'accueil.
  const idsAbsents = new Set(absentsAujourdhui.map((a) => a.user.id));
  const idsTeletravail = new Set(teletravailleurs.map((t) => t.user.id));
  const statsAccueil = [
    { label: "au bureau aujourd'hui", valeur: equipeEnDirect.filter((m) => !idsAbsents.has(m.id) && !idsTeletravail.has(m.id)).length, href: "/planning" },
    { label: "en télétravail", valeur: teletravailleurs.length, href: "/planning" },
    { label: absentsAujourdhui.length > 1 ? "absents" : "absent", valeur: absentsAujourdhui.length, href: "/planning" },
    ...(estPatron || estCadreEquipe
      ? [{ label: "demandes à valider", valeur: `${demandesAValider.length}${demandesAValider.length >= 5 ? "+" : ""}`, href: estCadreEquipe ? "/mon-equipe" : "/employeur", accent: demandesAValider.length > 0 }]
      : []),
    ...(!estEmployeur
      ? [{ label: "jours de CP disponibles", valeur: Math.round((soldeCP.disponible + soldeCP.n1.disponible) * 100) / 100, href: "/mon-solde" }]
      : []),
    ...(!estEmployeur && user.visiblePlanning ? [{ label: "tickets restau ce mois", valeur: ticketsRestauMois, href: "/mes-tickets-restau" }] : []),
  ];

  return (
    <div>
      <PasswordChangeModal required={user.doitChangerMotDePasse} />
      {!user.doitChangerMotDePasse && estAnniversaireLe(user.dateNaissance, todayISO) && (
        <AnniversairePopup prenom={user.prenom} dateISO={todayISO} />
      )}
      {!user.doitChangerMotDePasse && !user.dateNaissance && <DateNaissancePopup />}
      <JourFeriePopup />
      {canAccess(session.user, "feries") && !user.doitChangerMotDePasse && <JourFerieDirectionPopup />}
      <TRLivraisonPopup />

      <DashboardHero
        prenom={user.prenom}
        sousTitre={estEmployeur ? "L'activité de votre équipe en un coup d'œil." : "Votre solde de congés et l'activité de votre équipe en un coup d'œil."}
        actions={[
          ...(estEmployeur ? [] : [{ href: "/demande", label: "+ Nouvelle demande" }]),
          { href: "/planning", label: "Voir le planning" },
        ]}
        stats={statsAccueil}
        extra={<LiensUtiles estAdmin={canAccess(session.user, "admin")} />}
      />

      {!estEmployeur && !user.soldeInitialSaisi && (
        <SoldeInitialBanner dateEntreeInitiale={user.dateEntree} />
      )}
      {user.accesRepasExterieur && !estEmployeur && !estWeekEnd && <RepasExterieurButton dejaSignale={!!regularisationDuJour} annulable={regularisationDuJour?.createdById === userId} />}

      <DashboardLayoutManager>
        <div dashboardId="equipe">
          <EquipeEnDirect personnes={equipeEnDirect} dateLabel={todayISO} />
        </div>

        <div dashboardId="soldes">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            {!estEmployeur && soldeCP.disponible > 0 && (
              <SoldeCard
                titre={`${cpLeaveType?.libelle || "Congé payé"} N`}
                couleur={cpLeaveType?.couleur || "#6CB64D"}
                valeur={soldeCP.disponible}
                total={soldeCP.acquis}
                utilise={soldeCP.pris}
                legende={`${soldeCP.pris} j pris sur la campagne en cours`}
                href="/mon-solde"
                info="Le solde se calcule jour par jour (+0,11 j) et peut parfois contenir une erreur : comparez avec votre dernière fiche de paie."
              >
                <DemandeVerificationSolde soldeAfficheN={soldeCP.disponible} soldeAfficheN1={soldeCP.n1.disponible} aDroitsN1={aDroitsN1} />
              </SoldeCard>
            )}

            {!estEmployeur && soldeCP.n1.disponible > 0 && (
              <SoldeCard
                titre={`${cpLeaveType?.libelle || "Congé payé"} N-1`}
                couleur="#9CCB3B"
                valeur={soldeCP.n1.disponible}
                total={soldeCP.n1.acquis}
                utilise={soldeCP.n1.pris}
                legende={`${soldeCP.n1.pris} j pris sur la campagne précédente`}
                href="/mon-solde"
              />
            )}

            {!estEmployeur &&
              balancesCurrentYear.map((b) => (
                <SoldeCard
                  key={b.id}
                  titre={b.leaveType.libelle}
                  couleur={b.leaveType.couleur}
                  valeur={Math.max(0, b.joursAcquis - b.joursPris)}
                  total={b.joursAcquis}
                  utilise={b.joursPris}
                  legende={`${b.joursPris} j pris cette année`}
                  href="/mon-solde"
                />
              ))}

            {user.visiblePlanning && !estEmployeur && (
              <SoldeCard
                titre="Tickets restaurant"
                couleur="#FFF200"
                valeur={ticketsRestauMois}
                unite={ticketsRestauMois > 1 ? "tickets" : "ticket"}
                legende={`${now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} · soit ${(ticketsRestauMois * 10).toFixed(2)} €`}
                href="/mes-tickets-restau"
                lien="Voir mes tickets"
              >
                {livraisonMois?.livreLe && (
                  <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[11px] font-semibold text-brand-greendark">
                    ✓ Livrés le {new Date(livraisonMois.livreLe).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </SoldeCard>
            )}

            {!estEmployeur && balancesCurrentYear.length === 0 && !aUnSoldeCP && (
              <div className="col-span-full rounded-2xl border border-dashed border-black/10 p-5 text-sm text-brand-dark/60 dark:border-white/15">
                Aucun solde initialisé pour {year}. Contactez l'administrateur.
              </div>
            )}
          </div>
        </div>

        {(estPatron || estCadreEquipe) && (
          <div dashboardId="validations">
            <WidgetCard
              titre="Demandes de congés à valider"
              icone="validation"
              compteur={demandesAValider.length > 0 ? `${demandesAValider.length}${demandesAValider.length >= 5 ? "+" : ""} en attente` : null}
              tonCompteur="jaune"
              action={{ href: estCadreEquipe ? "/mon-equipe" : "/employeur", label: "Traiter les demandes" }}
            >
              {demandesAValider.length === 0 ? (
                <Vide titre="Aucune demande en attente" sousTitre="Tout est traité 🎉" />
              ) : (
                <ul className="divide-y divide-black/5 dark:divide-white/10">
                  {demandesAValider.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <Avatar prenom={r.user.prenom} nom={r.user.nom} couleur={r.leaveType.couleur} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark">
                        {r.user.prenom} {r.user.nom}
                      </span>
                      {r.exceptionnelle && <Pill tone="yellow">Prioritaire</Pill>}
                      <TypeBadge leaveType={r.leaveType} />
                      <span className="text-xs text-brand-dark/50">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>
          </div>
        )}

        <div dashboardId="activite">
          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
            {!estEmployeur && (
              <WidgetCard
                titre="Mes dernières demandes"
                icone="demandes"
                compteur={pendingCount > 0 ? `${pendingCount} en attente` : null}
                tonCompteur="jaune"
                action={requests.length > 0 ? { href: "/mes-demandes", label: "Voir tout l'historique" } : null}
                className="lg:col-span-2"
              >
                {requests.length === 0 ? (
                  <Vide titre="Aucune demande pour le moment" sousTitre="Faites votre première demande de congé en 3 clics." action={{ href: "/demande", label: "+ Faire une demande" }} />
                ) : (
                  <ul className="divide-y divide-black/5 dark:divide-white/10">
                    {requests.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5" style={{ boxShadow: `inset 3px 0 0 ${r.leaveType.couleur}` }}>
                        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                          <TypeBadge leaveType={r.leaveType} />
                          <span className="text-sm text-brand-dark/70">{formatPeriode(r.dateDebut, r.dateFin)}</span>
                          {r.supprimeParAdmin && <Pill tone="yellow">Supprimé par l'admin</Pill>}
                        </div>
                        {r.supprimeParAdmin ? <ConfirmerSuppressionAdminButton requestId={r.id} /> : <StatusBadge statut={r.statut} />}
                      </li>
                    ))}
                  </ul>
                )}
              </WidgetCard>
            )}

            <WidgetCard
              titre="Aujourd'hui"
              icone="pin"
              compteur={
                [
                  absentsAujourdhui.length > 0 && `${absentsAujourdhui.length} absent${absentsAujourdhui.length > 1 ? "s" : ""}`,
                  teletravailleurs.length > 0 && `${teletravailleurs.length} en TT`,
                ]
                  .filter(Boolean)
                  .join(" · ") || null
              }
              action={{ href: "/planning?vue=jour", label: "Voir le planning du jour" }}
              className={estEmployeur ? "lg:col-span-3" : ""}
            >
              {absentsAujourdhui.length === 0 && teletravailleurs.length === 0 ? (
                <Vide titre="Toute l'équipe est au bureau 🎉" />
              ) : (
                <div className="divide-y divide-black/5 dark:divide-white/10">
                  {absentsAujourdhui.length > 0 && (
                    <div className="px-5 py-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">Absents</p>
                      <ul className="space-y-2">
                        {absentsAujourdhui.map((a) => (
                          <li key={a.user.id} className="flex items-start gap-2.5">
                            <Avatar prenom={a.user.prenom} nom={a.user.nom} couleur={a.leaveTypes[0]?.couleur} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-brand-dark">
                                {a.user.prenom} {a.user.nom}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {a.leaveTypes.map((t) => (
                                  <TypeBadge key={t.code} leaveType={t} />
                                ))}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {teletravailleurs.length > 0 && (
                    <div className="px-5 py-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">En télétravail</p>
                      <ul className="space-y-2">
                        {teletravailleurs.map((tt) => (
                          <li key={tt.user.id} className="flex items-start gap-2.5">
                            <Avatar prenom={tt.user.prenom} nom={tt.user.nom} couleur="#2563EB" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-brand-dark">
                                {tt.user.prenom} {tt.user.nom}
                              </p>
                              <span className="mt-1 inline-block rounded-full bg-[#2563EB]/10 px-2.5 py-0.5 text-xs font-medium text-brand-dark">
                                Télétravail{tt.demiJournee ? (tt.demiJourneePeriode === "MATIN" ? " (matin)" : " (après-midi)") : ""}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </WidgetCard>
          </div>
        </div>
      </DashboardLayoutManager>
    </div>
  );
}
