"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TRMoisPicker({ currentMois }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleChange(e) {
    const value = e.target.value;
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
        <input
          type="month"
          autoFocus
          defaultValue={currentMois}
          onChange={handleChange}
          onBlur={() => setOpen(false)}
          className="absolute top-full left-0 mt-1 z-20 px-2.5 py-2 rounded-lg border border-black/10 bg-white text-xs shadow-card focus-ring outline-none"
        />
      )}
    </span>
  );
}
