"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemandeVerificationSolde() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/verification-solde", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motif }),
    });
    setLoading(false);
    if (res.ok) {
      setEnvoye(true);
      router.refresh();
      setTimeout(() => { setOpen(false); setEnvoye(false); setMotif(""); }, 1500);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-brand-dark/50 hover:text-brand-dark hover:underline mt-2">
        Signaler un problème de solde
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            {envoye ? (
              <p className="text-sm font-semibold text-brand-greendark text-center py-4">Demande envoyée ✓</p>
            ) : (
              <form onSubmit={envoyer} className="space-y-3">
                <h2 className="font-bold text-brand-dark">Signaler un problème de solde</h2>
                <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} placeholder="Précisez si besoin (optionnel)…" className="w-full px-3 py-2 rounded-xl border border-black/10 bg-brand-cream/60 text-sm outline-none resize-none" />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-1 bg-brand-dark text-brand-cream text-sm font-semibold py-2.5 rounded-xl">{loading ? "Envoi…" : "Envoyer à l'administrateur"}</button>
                  <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl border border-black/10 text-sm font-semibold text-brand-dark">Annuler</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
