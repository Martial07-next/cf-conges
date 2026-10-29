"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { couleurPole } from "@/lib/poles";

// Filtre par pôle de la page Gestionnaire TR : garde la vue et la période
// affichées, ne change que le pôle.
export default function TRPoleFilter({ pole, poles }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function lien(valeur) {
    const params = new URLSearchParams(searchParams.toString());
    if (valeur) params.set("pole", valeur);
    else params.delete("pole");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const options = [{ valeur: "", label: "Tous les pôles" }, ...poles.map((p) => ({ valeur: p, label: p }))];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
            {options.map((o) => {
        const actif = o.valeur === pole;
        const couleur = couleurPole(o.valeur);
        return (
          <Link
            key={o.valeur || "tous"}
            href={lien(o.valeur)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              actif
                ? "border-brand-dark bg-brand-dark text-brand-cream dark:border-brand-green dark:bg-brand-green dark:text-[#16231a]"
                : "border-black/10 text-brand-dark/70 hover:bg-black/5 dark:border-white/10"
            }`}
          >
            {couleur && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: couleur }} />}
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
