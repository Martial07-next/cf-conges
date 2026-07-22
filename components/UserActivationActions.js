"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export function UserActivationActions({ userId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatut(statutCompte) {
    if (statutCompte === "DESACTIVE" && !confirm("Refuser l'accès de ce compte ?")) return;
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statutCompte }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="primary" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={() => setStatut("ACTIF")}>
        Activer
      </Button>
      <Button variant="danger" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={() => setStatut("DESACTIVE")}>
        Refuser
      </Button>
    </div>
  );
}

export function ToggleAccountButton({ userId, statutCompte }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const target = statutCompte === "ACTIF" ? "DESACTIVE" : "ACTIF";

  async function handleClick() {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statutCompte: target }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button variant={target === "ACTIF" ? "primary" : "danger"} className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={handleClick}>
      {target === "ACTIF" ? "Réactiver" : "Désactiver"}
    </Button>
  );
}
