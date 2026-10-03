"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function PlanningPoleFilter({ poles, poleActif }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!open) return;

    function fermerSiExterieur(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    function fermerAvecEchap(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", fermerSiExterieur);
    document.addEventListener("keydown", fermerAvecEchap);
    return () => {
      document.removeEventListener("pointerdown", fermerSiExterieur);
      document.removeEventListener("keydown", fermerAvecEchap);
    };
  }, [open]);

  function choisirPole(pole) {
    const params = new URLSearchParams(searchParams.toString());
    if (pole) params.set("pole", pole);
    else params.delete("pole");

    setOpen(false);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Filtrer le planning par pôle"
        title="Filtrer par pôle"
        className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors focus-ring ${
          poleActif
            ? "border-[rgb(10_254_107)] bg-[rgb(10_254_107)]/15 text-brand-dark"
            : "border-black/10 hover:bg-black/5 text-brand-dark"
        } ${isPending ? "opacity-60" : ""}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16M7 12h10M10 19h4" />
        </svg>
        <span className="hidden sm:inline">{poleActif || "Pôle"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 min-w-[190px] rounded-xl border border-black/10 bg-white p-1.5 shadow-card">
          <button
            type="button"
            onClick={() => choisirPole("")}
            className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
              !poleActif ? "bg-black/5 text-brand-dark" : "text-brand-dark/60 hover:bg-black/5"
            }`}
          >
            Tous les pôles
          </button>
          {poles.map((pole) => (
            <button
              key={pole}
              type="button"
              onClick={() => choisirPole(pole)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                poleActif === pole
                  ? "bg-[rgb(10_254_107)]/15 text-brand-dark"
                  : "text-brand-dark/60 hover:bg-black/5"
              }`}
            >
              {pole}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
