"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export default function VerificationSoldeActions({ id }) {
  const router = useRouter();
  const [reponse, setReponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function traiter() {
    setLoading(true);
    await fetch(`/api/verification-solde/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reponseAdmin: reponse }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input value={reponse} onChange={(e) => setReponse(e.target.value)} placeholder="Réponse (optionnelle)…" className="px-2.5 py-1.5 rounded-lg border border-black/10 text-xs w-40" />
      <Button variant="primary" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={traiter}>Marquer traitée</Button>
    </div>
  );
}
