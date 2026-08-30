"use client";

import { useRouter } from "next/navigation";

// tri: "" (ordre manuel/position) | "asc" | "desc" — service: valeur sélectionnée ou "" (tous)
// services: liste triée des pôles distincts déjà présents en base
const LABELS = {
  "": "Ordre manuel (position)",
  asc: "Nom A → Z",
  desc: "Nom Z → A",
};
const NEXT = { "": "asc", asc: "desc", desc: "" };

export default function UsersFilterBar({ tri, service, services }) {
  const router = useRouter();

  function go(nextTri, nextService) {
    const params = new URLSearchParams();
    if (nextTri) params.set("tri", nextTri);
    if (nextService) params.set("service", nextService);
    const qs = params.toString();
    router.push(`/admin/utilisateurs${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <button
        onClick={() => go(NEXT[tri], service)}
        className="text-xs font-semibold border border-black/10 rounded-lg px-3 py-1.5 bg-brand-cream/60 hover:bg-black/5 focus-ring outline-none"
      >
        Tri : {LABELS[tri]} changer
      </button>

      <select
        value={service}
        onChange={(e) => go(tri, e.target.value)}
        className="text-xs font-medium border border-black/10 rounded-lg px-2 py-1.5 bg-brand-cream/60 focus-ring outline-none"
      >
        <option value="">Tous les pôles</option>
        {services.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {(tri !== "" || service) && (
        <button
          onClick={() => go("", "")}
          className="text-xs font-semibold text-brand-dark/50 hover:underline"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
