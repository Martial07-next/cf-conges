"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

export default function AjustementSoldeForm({ users }) {
  const router = useRouter();
  const [userId, setUserId] = useState(users[0]?.id || "");
  const [annee, setAnnee] = useState(new Date().getMonth() >= 5 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  const [valeurCible, setValeurCible] = useState("");
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function envoyer(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/ajustements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ userId, annee, valeurCible, motif }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage("Ajustement enregistré ✓");
      setMontant("");
      setMotif("");
      router.refresh();
    } else {
      setMessage(data.error || "Erreur.");
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-bold text-brand-dark mb-1">Ajustement manuel de solde</h2>
            <p className="text-sm text-brand-dark/60 mb-4">
        Indiquez directement le solde final voulu — le système calcule l'écart tout seul, aucun risque de calcul mental faux.
      </p>
      <form onSubmit={envoyer} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Collaborateur</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm">
            {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Campagne</label>
            <input type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Solde final voulu</label>
            <input type="number" step="0.01" required value={valeurCible} onChange={(e) => setValeurCible(e.target.value)} placeholder="ex: 15" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Motif (obligatoire)</label>
          <input required value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="ex: régularisation historique pré-plateforme" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm" />
        </div>
        {message && <p className="text-xs text-brand-dark">{message}</p>}
        <Button type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Appliquer l'ajustement"}</Button>
      </form>
    </Card>
  );
}
