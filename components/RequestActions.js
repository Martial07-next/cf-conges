"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export function CancelButton({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Annuler cette demande ?")) return;
    setLoading(true);
    const res = await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "annuler" }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleCancel} disabled={loading} className="!px-3 !py-1.5 !text-xs">
      {loading ? "…" : "Annuler"}
    </Button>
  );
}

export function ValidationActions({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [commentaire, setCommentaire] = useState("");

  async function act(action, extra = {}) {
    setLoading(true);
    const res = await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert(data.error || "Erreur.");
      return;
    }
    setRefusing(false);
    router.refresh();
  }

  if (refusing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Motif du refus…"
          className="px-2.5 py-1.5 rounded-lg border border-black/10 text-xs w-40 focus-ring outline-none"
        />
        <Button
          variant="danger"
          className="!px-3 !py-1.5 !text-xs"
          disabled={loading || commentaire.trim().length < 3}
          onClick={() => act("refuser", { commentaireRefus: commentaire })}
        >
          Confirmer
        </Button>
        <button onClick={() => setRefusing(false)} className="text-xs text-brand-dark/50 hover:underline">
          annuler
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="primary" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={() => act("valider")}>
        Valider
      </Button>
      <Button variant="danger" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={() => setRefusing(true)}>
        Refuser
      </Button>
    </div>
  );
}
