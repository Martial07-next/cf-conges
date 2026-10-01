"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export default function VerificationSoldeActions({ id, userId, soldeDeclareN, soldeDeclareN1 }) {
  const router = useRouter();
  const [reponse, setReponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  async function traiter() {
    setLoading(true);
    setErreur("");
    const res = await fetch(`/api/verification-solde/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reponseAdmin: reponse }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error || "Impossible de traiter la demande.");
      return;
    }
    router.refresh();
  }

  async function corrigerN() {
    if (soldeDeclareN === null || soldeDeclareN === undefined) return;
    setLoading(true);
    setErreur("");
    const res = await fetch(`/api/verification-solde/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reponseAdmin: reponse,
        appliquerCorrectionN: true,
        valeurCibleN: soldeDeclareN,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error || "Impossible d'appliquer la correction.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input value={reponse} onChange={(e) => setReponse(e.target.value)} placeholder="Réponse / motif de correction…" className="px-2.5 py-1.5 rounded-lg border border-black/10 text-xs w-56" />
      <div className="flex flex-wrap justify-end gap-2">
        {soldeDeclareN !== null && soldeDeclareN !== undefined && (
          <Button variant="primary" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={corrigerN}>
            Corriger N à {soldeDeclareN} j
          </Button>
        )}
        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={traiter}>Clôturer sans correction</Button>
      </div>
      {erreur && <p className="text-xs text-alert-soft">{erreur}</p>}
    </div>
  );
}
