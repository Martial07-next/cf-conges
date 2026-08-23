"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TRMoisPicker({ currentMois }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentMois);

  function aller() {
    if (!value) return;
    router.push(`/tr?vue=semaines&mois=${value}`);
    setOpen(false);
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Aller à un mois"
        className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 text-brand-dark focus-ring"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 flex items-center gap-1.5 p-2 rounded-lg border border-black/10 bg-white shadow-card">
          <input
            type="month"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aller()}
            className="px-2 py-1.5 rounded-lg border border-black/10 text-xs focus-ring outline-none"
          />
          <button
            type="button"
            onClick={aller}
            className="px-2.5 py-1.5 rounded-lg bg-brand-green hover:bg-brand-greendark hover:text-white text-brand-dark text-xs font-semibold"
          >
            Aller
          </button>
        </div>
      )}
    </span>
  );
}
