import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import BandeauPage, { TuileChiffre } from "@/components/BandeauPage";
import { calculerTicketsRestau } from "@/lib/ticketsRestau";
import { calculerSoldeCP } from "@/lib/moteurConges";
import ComptableTable from "@/components/ComptableTable";

export const dynamic = "force-dynamic";

const restant = (balance) => Math.max(0, balance.joursAcquis - balance.joursPris);
const campagneDepuisDate = (date = new Date()) =>
  date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
const labelCampagne = (annee) => `${annee}–${annee + 1}`;

export default async function ComptablePage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccessAny(session.user, ["comptable", "employeur", "admin"])) redirect("/dashboard");

  const campagneActuelle = campagneDepuisDate();
  const campagne = Number(searchParams?.annee) || campagneActuelle;

  // Le CP se calcule "a la date de reference" de la campagne consultee : si
  // c'est la campagne en cours, on s'arrete a aujourd'hui ; sinon (campagne
  // passee) on prend la toute derniere date de cette campagne, pour un
  // total complet.
  const dateReferenceCampagne =
    campagne === campagneActuelle ? new Date() : new Date(campagne + 1, 4, 31, 23, 59, 59);

  const debutCampagne = new Date(campagne, 5, 1);
  const finCampagne = new Date(campagne + 1, 4, 31, 23, 59, 59);

  const [balances, users, demandesEnfantMalade] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { annee: campagne, leaveType: { code: { not: "CP" } } },
      include: { user: true, leaveType: true },
      orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
    }),
    prisma.user.findMany({
      where: { statutCompte: "ACTIF", visibleCompta: true },
      orderBy: { nom: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        statut: "VALIDE",
        dateDebut: { lte: finCampagne },
        dateFin: { gte: debutCampagne },
        motifFixe: { libelle: "Enfant malade" },
      },
      select: { userId: true, joursRemuneres: true, joursNonRemuneres: true },
    }),
  ]);

  const ticketsParUser = await calculerTicketsRestau(users, campagne);

  // Le comptable consulte une campagne à la fois. Le moteur est appelé à la
  // date de référence de la campagne sélectionnée pour obtenir son total.
  const soldesCP = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      solde: await calculerSoldeCP(prisma, user.id, dateReferenceCampagne),
    }))
  );
  const soldeCPParUser = new Map(soldesCP.map((s) => [s.userId, s.solde]));

  const idsVisibles = new Set(users.map((user) => user.id));
  const balancesN = balances.filter((balance) => balance.annee === campagne && idsVisibles.has(balance.userId));
  const parUser = new Map(users.map((user) => [user.id, { user, n: [] }]));
  for (const balance of balancesN) {
    const ligne = parUser.get(balance.userId);
    if (ligne) ligne.n.push(balance);
  }

  const totalCPAcquis = soldesCP.reduce((s, x) => s + x.solde.acquis, 0);
  const totalCPPris = soldesCP.reduce((s, x) => s + x.solde.pris, 0);
  const totalCPDisponible = soldesCP.reduce((s, x) => s + x.solde.disponible, 0);
  const totalTickets = users.reduce(
    (somme, user) => somme + (ticketsParUser[user.id] || []).reduce((a, b) => a + b, 0),
    0
  );

  const enfantMaladeParUser = new Map();
  for (const demande of demandesEnfantMalade) {
    const courant = enfantMaladeParUser.get(demande.userId) || { remuneres: 0, nonRemuneres: 0 };
    courant.remuneres += Number(demande.joursRemuneres || 0);
    courant.nonRemuneres += Number(demande.joursNonRemuneres || 0);
    enfantMaladeParUser.set(demande.userId, courant);
  }

  const controles = [];

  for (const user of users) {
    const soldeCP = soldeCPParUser.get(user.id);
    const enfantMalade = enfantMaladeParUser.get(user.id);
    if (enfantMalade?.nonRemuneres > 0) {
      controles.push({
        user,
        niveau: "attention",
        titre: "Enfant malade non rémunéré",
        detail: `${enfantMalade.nonRemuneres} j non rémunéré(s) à prendre en compte en paie.`,
      });
    }
    if (!user.dateEntree) {
      controles.push({
        user,
        niveau: "important",
        titre: "Date d'entrée manquante",
        detail: "Le calcul des droits CP ne peut pas être fiabilisé sans date d'entrée.",
      });
      continue;
    }

    const entree = new Date(user.dateEntree);
    const concerneCampagne = entree <= finCampagne;

    if (concerneCampagne && soldeCP && soldeCP.acquis < 0) {
      controles.push({
        user,
        niveau: "important",
        titre: "Acquis CP incohérent",
        detail: "Le total acquis calculé est négatif et doit être vérifié.",
      });
    }

    if (concerneCampagne && soldeCP && soldeCP.pris < 0) {
      controles.push({
        user,
        niveau: "important",
        titre: "Consommation CP incohérente",
        detail: "Le nombre de jours consommés est négatif et doit être vérifié.",
      });
    }

    if (concerneCampagne && soldeCP && soldeCP.pris > soldeCP.acquis && soldeCP.disponible === 0) {
      controles.push({
        user,
        niveau: "attention",
        titre: "CP consommés supérieurs aux acquis",
        detail: `${soldeCP.pris} j consommés pour ${soldeCP.acquis} j acquis sur la campagne.`,
      });
    }
  }


  return (
    <div>
      <BandeauPage
        icone="comptable"
        titre="Espace comptable"
        sousTitre={`Contrôle social et avantages salariés · ${users.length} collaborateur${users.length > 1 ? "s" : ""} suivi${users.length > 1 ? "s" : ""}`}
      >
        <Link href={`/comptable?annee=${campagne - 1}`} aria-label="Campagne précédente" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#EBF0E8] hover:bg-white/10">‹</Link>
        <span className="min-w-[140px] px-1 text-center text-sm font-semibold">Campagne {labelCampagne(campagne)}</span>
        <Link href={`/comptable?annee=${campagne + 1}`} aria-label="Campagne suivante" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#EBF0E8] hover:bg-white/10">›</Link>
        {campagne !== campagneActuelle && (
          <Link href="/comptable" className="whitespace-nowrap rounded-lg bg-[#0afe6b] px-3 py-1.5 text-xs font-bold text-[#0E1712] hover:bg-[#3dff8c]">
            Campagne en cours
          </Link>
        )}
      </BandeauPage>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2.5 shadow-card dark:border-white/10 dark:bg-brand-night">
        <span className="text-xs text-brand-dark/55">
          {campagne === campagneActuelle ? "Campagne en cours : chiffres arrêtés à aujourd’hui." : "Campagne passée : chiffres complets au 31 mai."}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a href={`/api/export?annee=${campagne}`} className="inline-flex rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-black/5">
            Export CSV
          </a>
          <a href={`/api/export-complet?annee=${campagne}`} className="inline-flex rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-[#16231A] hover:brightness-95">
            ↓ Export Excel complet
          </a>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <TuileChiffre valeur={`${totalCPAcquis.toFixed(2)} j`} label="CP acquis" couleur="#16A34A" />
        <TuileChiffre valeur={`${totalCPPris.toFixed(2)} j`} label="CP consommés" couleur="#F97316" />
        <TuileChiffre valeur={`${totalCPDisponible.toFixed(2)} j`} label="CP restants" couleur="#2563EB" />
        <TuileChiffre valeur={totalTickets} label={`tickets restaurant · ${(totalTickets * 10).toFixed(0)} €`} couleur="#0afe6b" />
        <TuileChiffre valeur={controles.length} label={controles.length > 1 ? "points de contrôle" : "point de contrôle"} couleur={controles.length ? "#DC2626" : "#16A34A"} />
      </div>

      <ComptableTable
        lignes={[...parUser.values()].map(({ user, n }) => {
          const soldeCP = soldeCPParUser.get(user.id) || { acquis: 0, pris: 0, disponible: 0 };
          return {
            id: user.id,
            prenom: user.prenom,
            nom: user.nom,
            pole: user.pole || user.service || "",
            acquis: soldeCP.acquis,
            pris: soldeCP.pris,
            disponible: soldeCP.disponible,
            tickets: (ticketsParUser[user.id] || []).reduce((a, b) => a + b, 0),
            enfantMalade: enfantMaladeParUser.get(user.id) || null,
            autresCompteurs: n.map((balance) => ({
              id: balance.id,
              code: balance.leaveType.code,
              valeur: balance.leaveType.comptabiliseSolde
                ? `${restant(balance)} j`
                : `${balance.joursPris} j pris`,
            })),
            controles: controles
              .filter((controle) => controle.user.id === user.id)
              .map((controle) => ({ titre: controle.titre, detail: controle.detail })),
          };
        })}
      />

      <p className="mt-3 text-[11px] text-brand-dark/40">
        Les données affichées restent calculées par les moteurs actuels de CF Congés. L'export Excel complet conserve son fonctionnement existant.
      </p>
    </div>
  );
}
