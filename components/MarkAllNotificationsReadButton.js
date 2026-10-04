"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkAllNotificationsReadButton({ disabled = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/mes-notifications", { method: "PATCH" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.error || "Les notifications n'ont pas pu être marquées comme lues.");
        return;
      }
      router.refresh();
    } catch {
      alert("Impossible de mettre à jour les notifications. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold text-brand-dark transition-colors hover:border-brand-green hover:bg-brand-green/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? "Mise à jour..." : "Tout marquer comme lu"}
    </button>
  );
}
