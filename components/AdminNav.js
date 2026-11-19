import Link from "next/link";
import Icone from "./Icone";

// Onglets communs à toutes les pages de l'administration. L'Employeur / RH
// ne voit que les pages auxquelles il a accès (utilisateurs, soldes).
const PAGES = [
  { href: "/admin", label: "Accueil", icone: "admin", employeur: true },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icone: "utilisateurs", employeur: true },
  { href: "/admin/soldes", label: "Congés & soldes", icone: "solde", employeur: true },
  { href: "/admin/types-conges", label: "Types de congés", icone: "types" },
  { href: "/admin/motifs", label: "Motifs", icone: "demande" },
  { href: "/admin/journal", label: "Journal", icone: "journal" },
  { href: "/admin/osefbot", label: "MatthiasBot", icone: "notifications", adminSeul: true },
];

export default function AdminNav({ actif, employeurRH = false, estAdmin = true }) {
  const pages = PAGES.filter((p) => (employeurRH ? p.employeur : true) && (!p.adminSeul || estAdmin));
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-black/5 bg-white p-1.5 shadow-card dark:border-white/10 dark:bg-brand-night" aria-label="Administration">
      {pages.map((p) => {
        const courant = actif === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={courant ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              courant ? "bg-brand-green text-[#16231A]" : "text-brand-dark/60 hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10"
            }`}
          >
            <Icone name={p.icone} className="h-4 w-4" />
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
