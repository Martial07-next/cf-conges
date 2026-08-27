"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export default function ViderHistoriqueRefusButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Masquer tout l'historique des refus de cette liste ? Les demandes elles-mêmes ne sont pas supprimées, elles disparaissent juste de cette vue.")) return;
    setLoading(true);
    const res = await fetch("/api/leave-requests/vider-refus", { method: "DELETE" });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleClick} disabled={loading} className="!px-3 !py-1.5 !text-xs shrink-0">
      {loading ? "…" : "Vider l'historique"}
    </Button>
  );
}
