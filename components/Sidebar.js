"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { canAccess } from "@/lib/permissions";
import Logo from "./Logo";
import { BugReportModal } from "./bugreportbutton";

const BASE_LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "grid" },
  { href: "/demande", label: "Nouvelle demande", icon: "plus" },
  { href: "/mes-demandes", label: "Mes demandes", icon: "list" },
  { href: "/planning", label: "Planning équipe", icon: "calendar" },
];

const OPTIONAL_LINKS = [
  { tab: "comptable", href: "/comptable", label: "Espace comptable", icon: "coins" },
  { tab: "tr", href: "/tr", label: "Gestionnaire TR", icon: "utensils" },
  { tab: "employeur", href: "/employeur", label: "Validation & accès", icon: "check" },
  { tab: "admin", href: "/admin", label: "Administration", icon: "settings" },
];

const FOOT_LINKS = [
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/profil", label: "Mon profil", icon: "user" },
];

const ROLE_LABEL = {
  COLLABORATEUR: "Collaborateur",
  COMPTABLE: "Comptable",
  EMPLOYEUR: "Employeur / RH",
  ADMIN: "Administrateur",
};

function Icon({ name, className }) {
  const paths = {
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    plus: "M12 5v14M5 12h14",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    coins: "M12 8a4 8 0 1 0 0 16 4 8 0 1 0 0-16Z",
    utensils: "M3 2v7c0 1.1.9 2 2 2h1v11h2V4M17 2v20M17 2a3 3 0 0 0-3 3v6h6V5a3 3 0 0 0-3-3Z",
    check: "M20 6 9 17l-5-5",
    settings:
      "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
    bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0",
    user: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    menu: "M3 6h18M3 12h18M3 18h18",
    close: "M18 6 6 18M6 6l12 12",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name] || ""} />
    </svg>
  );
}

function NavLinks({ links, pathname, onNavigate }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {links.map((l) => {
        const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-ring ${
              active ? "bg-brand-green text-brand-dark" : "text-brand-cream/80 hover:bg-white/10 hover:text-brand-cream"
            }`}
          >
            <Icon name={l.icon} className="w-4 h-4 shrink-0" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function FootLinks({ pathname, session, role, onNavigate }) {
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
            <Icon name={l.icon} className="w-4 h-4 shrink-0" />
            {l.label}
          </Link>
        );
      })}

      {session?.user && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="px-3 pb-2">
            <p className="text-sm font-semibold text-brand-cream truncate">{session.user.name}</p>
            <p className="text-[11px] text-brand-cream/50 truncate">{ROLE_LABEL[role] || role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-brand-cream/70 hover:bg-white/10 hover:text-brand-cream focus-ring"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [open, setOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const links = [...BASE_LINKS, ...OPTIONAL_LINKS.filter((l) => canAccess(session?.user, l.tab))];
  if (session?.user?.estAlternant || session?.user?.estTuteur) {
    links.push({ href: "/ecole", label: "École", icon: "calendar" });
  }

  return (
    <>
      {/* Barre mobile (masquée sur bureau) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-brand-dark text-brand-cream sticky top-0 z-40">
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
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-brand-dark text-brand-cream flex flex-col shadow-2xl">
            <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Fermer le menu" className="p-2 -mr-2 text-brand-cream focus-ring rounded-lg">
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>
                       <NavLinks links={links} pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="px-3">
              <button
                onClick={() => { setOpen(false); setBugOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 focus-ring"
              >
                <span className="w-4 h-4 shrink-0 flex items-center justify-center">⚠</span>
                Signaler un problème
              </button>
            </div>
            <FootLinks pathname={pathname} session={session} role={role} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

           {/* Barre laterale bureau — fixe a l'ecran, ne bouge jamais au scroll */}
      <aside className="hidden md:flex w-64 shrink-0 bg-brand-dark text-brand-cream flex-col h-screen fixed top-0 left-0 z-30">
        <BugReportModal open={bugOpen} onClose={() => setBugOpen(false)} />
        <div className="px-5 py-6 border-b border-white/10">
          <Logo />
        </div>
        <NavLinks links={links} pathname={pathname} />
        <FootLinks pathname={pathname} session={session} role={role} />
      </aside>
    </>
  );
}
