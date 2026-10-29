import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { calculerSoldeCP } from "@/lib/moteurConges";
import { couleurPole } from "@/lib/poles";
import { estDirection } from "@/lib/agendaDirection";

export const dynamic = "force-dynamic";

const ROLE_LABEL = {
  COLLABORATEUR: "Collaborateur",
  COMPTABLE: "Comptable",
  EMPLOYEUR: "Employeur / RH",
  CADRE: "Cadre",
  ADMIN: "Administrateur",
};

function anciennete(dateEntree) {
  if (!dateEntree) return null;
  const debut = new Date(dateEntree);
  const maintenant = new Date();
  let mois = (maintenant.getFullYear() - debut.getFullYear()) * 12 + (maintenant.getMonth() - debut.getMonth());
  if (maintenant.getDate() < debut.getDate()) mois -= 1;
  if (mois < 1) return "Arrivé(e) ce mois-ci";
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  const morceaux = [ans > 0 && `${ans} an${ans > 1 ? "s" : ""}`, reste > 0 && `${reste} mois`].filter(Boolean);
  return `Chez CF Réseaux depuis ${morceaux.join(" et ")}`;
}

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teletravailOverrides: { orderBy: { date: "asc" } },
      teletravailJoursFixes: { orderBy: [{ jour: "asc" }, { dateDebut: "desc" }] },
      tuteur: { select: { prenom: true, nom: true } },
    },
  });

  const estEmployeur = user.role === "EMPLOYEUR";
  const aujourdHui = new Date();
  const [solde, enAttente, prochainConge] = await Promise.all([
    estEmployeur ? null : calculerSoldeCP(prisma, user.id),
    estEmployeur ? 0 : prisma.leaveRequest.count({ where: { userId: user.id, statut: "EN_ATTENTE" } }),
    estEmployeur
      ? null
      : prisma.leaveRequest.findFirst({
          where: { userId: user.id, statut: "VALIDE", dateFin: { gte: aujourdHui }, leaveType: { code: { notIn: ["TT", "ec"] } } },
          include: { leaveType: true },
          orderBy: { dateDebut: "asc" },
        }),
  ]);

  const couleur = couleurPole(user.pole) || "#0afe6b";
  const initiales = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();
  const stats = [
    solde && { valeur: Math.round((solde.disponible + solde.n1.disponible) * 100) / 100, label: "jours de CP disponibles", href: "/mon-solde" },
    !estEmployeur && { valeur: enAttente, label: enAttente > 1 ? "demandes en attente" : "demande en attente", href: "/mes-demandes" },
    !estEmployeur && {
      valeur: prochainConge ? new Date(prochainConge.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—",
      label: prochainConge ? `prochain congé (${prochainConge.leaveType.libelle})` : "aucun congé prévu",
      href: "/mes-demandes",
    },
  ].filter(Boolean);

  const raccourcis = [
    !estEmployeur && { href: "/mon-solde", label: "Mon solde", icone: "📊" },
    !estEmployeur && { href: "/mes-demandes", label: "Mes demandes", icone: "🗂️" },
    !estEmployeur && user.visiblePlanning && { href: "/mes-tickets-restau", label: "Mes tickets", icone: "🍽️" },
    estDirection(user) && { href: "/mon-agenda", label: "Mon agenda", icone: "📅" },
    { href: "/planning", label: "Planning équipe", icone: "🗓️" },
  ].filter(Boolean);

  return (
    <div className="max-w-5xl">
      {/* En-tête du profil */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-[#0E1712] text-[#EBF0E8] shadow-[0_12px_40px_-24px_rgba(10,254,107,0.45)] md:mt-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#0afe6b]/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-[#0E1712] ring-4 ring-white/10"
            style={{ backgroundColor: couleur }}
          >
            {initiales}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">
              {user.prenom} {user.nom}
            </h1>
            <p className="truncate text-sm text-[#EBF0E8]/55">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <span className="rounded-full bg-[#0afe6b]/15 px-2.5 py-1 text-[#0afe6b]">{ROLE_LABEL[user.role]}</span>
              {user.pole && (
                <span className="rounded-full border border-white/15 px-2.5 py-1" style={{ boxShadow: `inset 3px 0 0 ${couleur}` }}>
                  {user.pole}
                </span>
              )}
              {user.service && <span className="rounded-full border border-white/15 px-2.5 py-1">{user.service}</span>}
              {user.estAlternant && <span className="rounded-full border border-white/15 px-2.5 py-1">Alternant</span>}
              {anciennete(user.dateEntree) && <span className="rounded-full bg-white/5 px-2.5 py-1 text-[#EBF0E8]/70">{anciennete(user.dateEntree)}</span>}
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="relative grid grid-cols-1 gap-2 border-t border-white/[0.07] px-5 py-3 sm:grid-cols-3 sm:px-6">
            {stats.map((s) => (
              <Link key={s.label} href={s.href} className="flex items-baseline gap-2 rounded-xl px-2 py-1.5 transition hover:bg-white/5">
                <span className="text-lg font-bold tabular-nums">{s.valeur}</span>
                <span className="text-xs text-[#EBF0E8]/55">{s.label}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Raccourcis */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {raccourcis.map((r) => (
            <Link key={r.href} href={r.href} className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-brand-dark shadow-sm transition hover:border-brand-green/50 hover:bg-brand-green/10 dark:border-white/10 dark:bg-white/5">
              <span aria-hidden>{r.icone}</span>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <ProfileForm
        user={user}
        notifications={<PushNotificationToggle role={user.role} />}
        apparence={<ThemeToggle themeActuel={user.theme} />}
      />
    </div>
  );
}
