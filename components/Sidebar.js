"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Logo from "./Logo";

const BASE_LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "grid" },
  { href: "/demande", label: "Nouvelle demande", icon: "plus" },
  { href: "/mes-demandes", label: "Mes demandes", icon: "list" },
  { href: "/planning", label: "Planning équipe", icon: "calendar" },
];

const ROLE_LINKS = {
  COMPTABLE: [{ href: "/comptable", label: "Espace comptable", icon: "coins" }],
  EMPLOYEUR: [{ href: "/employeur", label: "Validation & accès", icon: "check" }],
  ADMIN: [
    { href: "/employeur", label: "Validation & accès", icon: "check" },
    { href: "/comptable", label: "Espace comptable", icon: "coins" },
    { href: "/admin", label: "Administration", icon: "settings" },
  ],
};

const FOOT_LINKS = [
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/profil", label: "Mon profil", icon: "user" },
];

function Icon({ name, className }) {
  const paths = {
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    plus: "M12 5v14M5 12h14",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    coins: "M12 8a4 8 0 1 0 0 16 4 8 0 1 0 0-16Z",
    check: "M20 6 9 17l-5-5",
    settings:
      "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
    bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0",
    user: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name] || ""} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const links = [...BASE_LINKS, ...(ROLE_LINKS[role] || [])];

  return (
    <aside className="w-64 shrink-0 bg-brand-dark text-brand-cream flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-white/10">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
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

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {FOOT_LINKS.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
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
    </aside>
  );
}

const ROLE_LABEL = {
  COLLABORATEUR: "Collaborateur",
  COMPTABLE: "Comptable",
  EMPLOYEUR: "Employeur / RH",
  ADMIN: "Administrateur",
};
