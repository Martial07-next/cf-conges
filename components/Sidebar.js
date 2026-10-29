"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { seDeconnecter } from "@/lib/pushAppareil";
import { canAccess, estCadre } from "@/lib/permissions";
import { estDirection } from "@/lib/agendaDirection";
import Logo from "./Logo";
import Icone from "./Icone";
import { BugReportModal } from "./bugreportbutton";

const BASE_LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "dashboard" },
  { href: "/demande", label: "Nouvelle demande", icon: "demande", sansEmployeur: true },
  { href: "/mes-demandes", label: "Mes demandes", icon: "demandes", sansEmployeur: true },
  { href: "/planning", label: "Planning équipe", icon: "planning" },
];

// Les comptes Employeur / RH ne posent pas de congés : pas de "Nouvelle
// demande" ni de "Mes demandes" dans leur menu.
// Employeurs / RH et pôle Direction : "Mon agenda" pour indiquer où ils sont.
const LIEN_MON_AGENDA = { href: "/mon-agenda", label: "Mon agenda", icon: "agenda" };
function liensDeBase(user) {
  const liens = BASE_LINKS.filter((l) => !(l.sansEmployeur && user?.role === "EMPLOYEUR"));
  if (estDirection(user)) liens.splice(1, 0, LIEN_MON_AGENDA);
  return liens;
}

const OPTIONAL_LINKS = [
  { tab: "comptable", href: "/comptable", label: "Espace comptable", icon: "comptable" },
  { tab: "tr", href: "/tr", label: "Gestionnaire TR", icon: "tr" },
  { tab: "employeur", href: "/employeur", label: "Validation & accès", icon: "validation" },
  { tab: "feries", href: "/jours-feries", label: "Jours fériés", icon: "feries" },
  { tab: "admin", href: "/admin", label: "Administration", icon: "admin" },
];

// Le Cadre (référent de pôle) traite les demandes de son équipe.
const LIEN_MON_EQUIPE = { href: "/mon-equipe", label: "Mon équipe", icon: "equipe" };
function lienCadre(user) {
  return estCadre(user) && !canAccess(user, "employeur") ? [LIEN_MON_EQUIPE] : [];
}

const FOOT_LINKS = [
  { href: "/notifications", label: "Notifications", icon: "notifications" },
  { href: "/profil", label: "Mon profil", icon: "profil" },
];

const ROLE_LABEL = {
  COLLABORATEUR: "Collaborateur",
  COMPTABLE: "Comptable",
  EMPLOYEUR: "Employeur / RH",
  CADRE: "Cadre",
  ADMIN: "Administrateur",
};

function Icon({ name, className }) {
  return <Icone name={name} className={className} />;
}

function NavSection({ title, links, pathname, onNavigate }) {
  if (!links.length) return null;

  return (
    <div className="mb-5">
      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-cream/35">{title}</p>
      <div className="space-y-1">
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus-ring ${
                active
                  ? "bg-brand-green text-[#16231A] shadow-sm"
                  : "text-brand-cream/72 hover:bg-white/[0.07] hover:text-brand-cream"
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[#16231A]/60" />}
              <Icon name={l.icon} className={`w-[17px] h-[17px] shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`} />
              <span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NavLinks({ primaryLinks, followLinks, managementLinks, pathname, onNavigate }) {
  return (
    <nav className="flex-1 px-3 py-5 overflow-y-auto">
      <NavSection title="Mon espace" links={primaryLinks} pathname={pathname} onNavigate={onNavigate} />
      <NavSection title="Suivi" links={followLinks} pathname={pathname} onNavigate={onNavigate} />
      <NavSection title="Gestion" links={managementLinks} pathname={pathname} onNavigate={onNavigate} />
    </nav>
  );
}

function FootLinks({ pathname, session, role, onNavigate, unreadCount = 0 }) {
  return (
    <div className="px-3 py-4 border-t border-white/10 space-y-1">
      {FOOT_LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-ring ${
              active ? "bg-white/15 text-brand-cream" : "text-brand-cream/70 hover:bg-white/10 hover:text-brand-cream"
            }`}
          >
            <span className="relative shrink-0">
              <Icon name={l.icon} className="w-4 h-4" />
              {l.href === "/notifications" && unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex min-w-[17px] h-[17px] items-center justify-center rounded-full bg-brand-yellow px-1 text-[9px] font-black leading-none text-[#16231A] ring-2 ring-brand-night">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span className="flex-1">{l.label}</span>
            {l.href === "/notifications" && unreadCount > 0 && (
              <span className="rounded-full bg-brand-yellow/15 px-2 py-0.5 text-[10px] font-bold text-brand-yellow">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </Link>
        );
      })}

      {session?.user && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="mx-1 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-2.5">
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/15 text-xs font-bold text-brand-green ring-1 ring-brand-green/20">
                {(session.user.name || "?")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-cream">{session.user.name}</p>
                <p className="truncate text-[11px] text-brand-cream/45">{ROLE_LABEL[role] || role}</p>
              </div>
            </div>
            <button
              onClick={() => seDeconnecter(signOut)}
              className="mt-2 w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-brand-cream/55 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-ring"
            >
              <Icon name="logout" className="h-4 w-4 shrink-0" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed = false, onToggleCollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [open, setOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => setOpen(false), [pathname]);

  // Précharge les pages du menu une fois la session connue. Next.js conserve
  // ensuite les payloads RSC en cache client, ce qui rend les clics suivants
  // nettement plus réactifs sans contourner middleware/auth côté serveur.
  useEffect(() => {
    if (!session?.user?.id) return;

    const destinations = [
      ...liensDeBase(session.user).map((l) => l.href),
      ...FOOT_LINKS.map((l) => l.href),
      ...OPTIONAL_LINKS
        .filter((l) =>
          l.tab === "admin" && session.user.role === "EMPLOYEUR"
            ? true
            : canAccess(session.user, l.tab)
        )
        .map((l) => l.href),
      ...lienCadre(session.user).map((l) => l.href),
    ];

    if (session.user.estAlternant || session.user.estTuteur) {
      destinations.push("/ecole");
    }

    const precharger = () => {
      for (const href of new Set(destinations)) {
        if (href !== pathname) router.prefetch(href);
      }
    };

    // Ne concurrence pas le premier rendu : préchargement lorsque le navigateur
    // est disponible, avec un fallback court pour Safari/iOS.
    let timeoutId;
    let idleId;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(precharger, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(precharger, 350);
    }

    return () => {
      if (idleId && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [
    router,
    session?.user?.id,
    session?.user?.role,
    session?.user?.onglets,
    session?.user?.pole,
    session?.user?.estAlternant,
    session?.user?.estTuteur,
  ]);

  useEffect(() => {
    if (!session?.user?.id) {
      setUnreadCount(0);
      return;
    }

    let actif = true;
    async function chargerNotifications() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const notifications = await res.json();
        if (actif && Array.isArray(notifications)) {
          setUnreadCount(notifications.filter((notification) => !notification.lu).length);
        }
      } catch {
        // Le menu reste utilisable même si le compteur ne peut pas être actualisé.
      }
    }

    chargerNotifications();
    const interval = setInterval(chargerNotifications, 60000);
    return () => {
      actif = false;
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  const primaryLinks = liensDeBase(session?.user);
  const followLinks = [];
  const managementLinks = [
    ...lienCadre(session?.user),
    ...OPTIONAL_LINKS.filter((l) =>
      l.tab === "admin" && role === "EMPLOYEUR"
        ? true
        : canAccess(session?.user, l.tab)
    ),
  ];

  if (session?.user?.estAlternant || session?.user?.estTuteur) {
    followLinks.push({
      href: "/ecole",
      label: session?.user?.estTuteur && !session?.user?.estAlternant ? "Mes alternants" : "École",
      icon: "ecole",
    });
  }

  return (
    <>
      {/* Barre mobile (masquée sur bureau) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-brand-night text-brand-cream sticky top-0 z-40">
        <Logo />
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="p-2 -mr-2 text-brand-cream focus-ring rounded-lg"
        >
          <Icon name="menu" className="w-6 h-6" />
        </button>
      </div>

      {/* Tiroir mobile (masqué sur bureau) */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-brand-night text-brand-cream flex flex-col shadow-2xl">
            <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Fermer le menu" className="p-2 -mr-2 text-brand-cream focus-ring rounded-lg">
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>
                       <NavLinks primaryLinks={primaryLinks} followLinks={followLinks} managementLinks={managementLinks} pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="px-3">
              <button
                onClick={() => { setOpen(false); setBugOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-brand-cream/45 hover:bg-white/[0.06] hover:text-brand-cream/80 focus-ring"
              >
                <Icon name="alert" className="w-4 h-4 shrink-0" />
                Signaler un problème
              </button>
            </div>
            <FootLinks pathname={pathname} session={session} role={role} unreadCount={unreadCount} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

           {/* Fenêtre de signalement : en dehors des deux barres, s'affiche partout */}
      <BugReportModal open={bugOpen} onClose={() => setBugOpen(false)} />

      {/* Barre laterale bureau : fixe a l'ecran, ne bouge jamais au scroll */}
      <aside className={`hidden md:flex ${collapsed ? "w-20" : "w-64"} shrink-0 bg-brand-night text-brand-cream flex-col h-screen fixed top-0 left-0 z-30 border-r border-white/[0.06] transition-[width] duration-200`}>
        <div className={`border-b border-white/10 flex items-center ${collapsed ? "px-3 py-5 justify-center" : "px-5 py-6 justify-between"}`}>
          {!collapsed && <Logo />}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
            title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
            className="p-2 rounded-xl text-brand-cream/60 hover:text-brand-cream hover:bg-white/10 focus-ring"
          >
            <Icon name={collapsed ? "expand" : "collapse"} className="w-5 h-5" />
          </button>
        </div>
        {collapsed ? (
          <>
            <nav className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
              {[...primaryLinks, ...followLinks, ...managementLinks].map((l) => {
                const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    title={l.label}
                    aria-label={l.label}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 items-center justify-center rounded-xl transition-colors focus-ring ${
                      active ? "bg-brand-green text-[#16231A]" : "text-brand-cream/65 hover:bg-white/10 hover:text-brand-cream"
                    }`}
                  >
                    <Icon name={l.icon} className="w-[18px] h-[18px]" />
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-white/10 space-y-2">
              {FOOT_LINKS.map((l) => {
                const active = pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    title={l.label}
                    aria-label={l.label}
                    className={`relative flex h-11 items-center justify-center rounded-xl transition-colors focus-ring ${
                      active ? "bg-white/15 text-brand-cream" : "text-brand-cream/60 hover:bg-white/10 hover:text-brand-cream"
                    }`}
                  >
                    <Icon name={l.icon} className="w-[18px] h-[18px]" />
                    {l.href === "/notifications" && unreadCount > 0 && (
                      <span className="absolute right-1.5 top-1.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-yellow text-[8px] font-black text-[#16231A] flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <NavLinks primaryLinks={primaryLinks} followLinks={followLinks} managementLinks={managementLinks} pathname={pathname} />
            <FootLinks pathname={pathname} session={session} role={role} unreadCount={unreadCount} />
          </>
        )}
      </aside>
    </>
  );
}
