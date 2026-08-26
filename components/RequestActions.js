"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export function CancelButton({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [choix, setChoix] = useState(false);

  async function handleCancel() {
    if (!confirm("Annuler cette demande ?")) return;
    setLoading(true);
    const res = await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "annuler" }),
    });
    setLoading(false);
    if (res.ok) setChoix(true);
  }

  async function masquer(scope) {
    setLoading(true);
    await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "masquer", scope }),
    });
    setLoading(false);
    router.refresh();
  }

  if (choix) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="text-[11px] text-brand-dark/50">Masquer cette demande de :</p>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            onClick={() => masquer("dashboard")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg border border-black/10 text-[11px] font-semibold text-brand-dark hover:bg-black/5"
          >
            Tableau de bord
          </button>
          <button
            onClick={() => masquer("demandes")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg border border-black/10 text-[11px] font-semibold text-brand-dark hover:bg-black/5"
          >
            Mes demandes
          </button>
          <button
            onClick={() => masquer("les_deux")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-brand-green hover:bg-brand-greendark hover:text-white text-[11px] font-semibold text-brand-dark"
          >
            Les deux
          </button>
          <button onClick={() => router.refresh()} disabled={loading} className="px-2.5 py-1 text-[11px] text-brand-dark/40 hover:underline">
            Non merci
          </button>
        </div>
      </div>
    );
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

// Bouton côté collaborateur : demander l'annulation d'un congé déjà validé.
export function RequestCancelButton({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "demander_annulation", motif }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur.");
      return;
    }
    setAsking(false);
    router.refresh();
  }

  if (asking) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif (optionnel)…"
          className="px-2.5 py-1.5 rounded-lg border border-black/10 text-xs w-40 focus-ring outline-none"
        />
        <Button variant="danger" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={submit}>
          Confirmer
        </Button>
        <button onClick={() => setAsking(false)} className="text-xs text-brand-dark/50 hover:underline">
          annuler
        </button>
        {error && <p className="text-[10px] text-alert-soft">{error}</p>}
      </div>
    );
  }

  return (
    <Button variant="ghost" onClick={() => setAsking(true)} className="!px-3 !py-1.5 !text-xs">
      Demander l'annulation
    </Button>
  );
}

// Boutons côté employeur/admin : traiter une demande d'annulation en attente.
export function CancelRequestActions({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action) {
    setLoading(true);
    const res = await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
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
    <div className="flex items-center gap-2">
      <Button variant="primary" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={() => act("approuver_annulation")}>
        Approuver
      </Button>
      <Button variant="danger" className="!px-3 !py-1.5 !text-xs" disabled={loading} onClick={() => act("refuser_annulation")}>
        Refuser
      </Button>
    </div>
  );
}

// Bouton réservé à l'administrateur : supprime n'importe quel congé (validé
// ou en attente), sans limite de délai, et recrédite le solde si nécessaire.
// Le congé reste visible côté collaborateur jusqu'à sa confirmation.
export function AdminDeleteButton({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Supprimer ce congé ? Le solde du collaborateur sera recrédité si besoin. Le collaborateur devra confirmer avant que cela disparaisse de son suivi.")) return;
    setLoading(true);
    const res = await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "admin_supprimer" }),
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
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs font-semibold text-alert-soft hover:underline disabled:opacity-50"
    >
      {loading ? "Suppression…" : "Supprimer (admin)"}
    </button>
  );
}

// Bouton côté collaborateur : confirme la prise en compte d'une suppression
// faite par l'administrateur — fait disparaitre la demande du tableau de
// bord ET de mes demandes.
export function ConfirmerSuppressionAdminButton({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirmer() {
    setLoading(true);
    await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirmer_suppression_admin" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={confirmer} disabled={loading} className="text-[11px] font-semibold text-alert-soft hover:underline">
      {loading ? "…" : "OK, masquer"}
    </button>
  );
}

// Bouton générique côté collaborateur : masquer une demande dans un état
// terminal (ex: refusée) une fois qu'il en a pris connaissance. La demande
// reste dans l'historique en base, elle disparait juste de sa vue.
export function MasquerButton({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [choix, setChoix] = useState(false);

  async function masquer(scope) {
    setLoading(true);
    await fetch(`/api/leave-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "masquer", scope }),
    });
    setLoading(false);
    router.refresh();
  }

  if (choix) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="text-[11px] text-brand-dark/50">Masquer cette demande de :</p>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            onClick={() => masquer("dashboard")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg border border-black/10 text-[11px] font-semibold text-brand-dark hover:bg-black/5"
          >
            Tableau de bord
          </button>
          <button
            onClick={() => masquer("demandes")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg border border-black/10 text-[11px] font-semibold text-brand-dark hover:bg-black/5"
          >
            Mes demandes
          </button>
          <button
            onClick={() => masquer("les_deux")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-brand-green hover:bg-brand-greendark hover:text-white text-[11px] font-semibold text-brand-dark"
          >
            Les deux
          </button>
          <button onClick={() => setChoix(false)} disabled={loading} className="px-2.5 py-1 text-[11px] text-brand-dark/40 hover:underline">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setChoix(true)} className="text-[11px] font-semibold text-brand-dark/50 hover:underline">
      Masquer
    </button>
  );
}
