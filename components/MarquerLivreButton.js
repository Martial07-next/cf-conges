"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export default function MarquerLivreButton({ annee, mois }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function marquerLivre() {
    if (!confirm("Marquer les tickets restaurant de ce mois comme livrés ? Chaque collaborateur en sera informé.")) return;
    setLoading(true);
    const res = await fetch("/api/tr-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annee, mois }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert(data.error || "Erreur.");
      return;
    }
    router.refresh();
  }

  return (
    <Button variant="primary" disabled={loading} onClick={marquerLivre}>
      {loading ? "…" : "Marquer comme livré"}
    </Button>
  );
}
