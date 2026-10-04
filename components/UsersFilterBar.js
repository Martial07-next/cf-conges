"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const LABELS = {
  "": "Ordre manuel",
  asc: "Nom A → Z",
  desc: "Nom Z → A",
};

export default function UsersFilterBar({ tri, service, services, recherche = "" }) {
  const router = useRouter();
  const [search, setSearch] = useState(recherche);

  function go(nextTri, nextService, nextSearch = search) {
    const params = new URLSearchParams();
    if (nextTri) params.set("tri", nextTri);
    if (nextService) params.set("service", nextService);
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    const qs = params.toString();
    router.push(`/admin/utilisateurs${qs ? `?${qs}` : ""}`);
  }

  function submitSearch(e) {
    e.preventDefault();
    go(tri, service, search);
  }

  const filtresActifs = tri !== "" || service || recherche;

  return (
    <div className="mb-4 rounded-2xl border border-black/[0.07] bg-white/60 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form onSubmit={submitSearch} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/35 dark:text-brand-cream/35">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un collaborateur ou un email…"
              className="w-full rounded-xl border border-black/10 bg-brand-cream/50 py-2.5 pl-9 pr-3 text-sm text-brand-dark outline-none focus-ring dark:border-white/10 dark:bg-white/5 dark:text-brand-cream"
            />
          </div>
          <button type="submit" className="rounded-xl bg-brand-night px-3.5 py-2.5 text-xs font-bold text-brand-cream hover:opacity-90">
            Rechercher
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={service}
            onChange={(e) => go(tri, e.target.value)}
            className="rounded-xl border border-black/10 bg-brand-cream/60 px-3 py-2.5 text-xs font-semibold text-brand-dark outline-none focus-ring dark:border-white/10 dark:bg-white/5 dark:text-brand-cream"
          >
            <option value="">Tous les services</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={tri}
            onChange={(e) => go(e.target.value, service)}
            className="rounded-xl border border-black/10 bg-brand-cream/60 px-3 py-2.5 text-xs font-semibold text-brand-dark outline-none focus-ring dark:border-white/10 dark:bg-white/5 dark:text-brand-cream"
          >
            {Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          {filtresActifs && (
            <button onClick={() => { setSearch(""); go("", "", ""); }} className="rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-dark/50 hover:bg-black/5 hover:text-brand-dark dark:text-brand-cream/50 dark:hover:bg-white/5 dark:hover:text-brand-cream">
              Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
