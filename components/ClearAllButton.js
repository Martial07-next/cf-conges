"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// endpoint: URL de l'API à appeler en DELETE (ex. "/api/notifications" ou "/api/audit-log")
// label: texte du bouton
// confirmMessage: texte de la confirmation avant suppression
export default function ClearAllButton({ endpoint, label, confirmMessage }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(confirmMessage)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.error || "La suppression n'a pas pu être effectuée.");
        return;
      }
      router.refresh();
    } catch {
      alert("La suppression n'a pas pu être effectuée. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs font-semibold text-alert-soft hover:underline disabled:opacity-50"
    >
      {loading ? "Suppression..." : label}
    </button>
  );
}
