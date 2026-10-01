"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemandeVerificationSolde({ soldeAfficheN, soldeAfficheN1 }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [soldeDeclareN, setSoldeDeclareN] = useState("");
  const [soldeDeclareN1, setSoldeDeclareN1] = useState("");
  const [loading, setLoading] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/verification-solde", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motif, soldeDeclareN, soldeDeclareN1 }),
    });
    setLoading(false);
    if (res.ok) {
      setEnvoye(true);
      router.refresh();
      setTimeout(() => { setOpen(false); setEnvoye(false); setMotif(""); setSoldeDeclareN(""); setSoldeDeclareN1(""); }, 1500);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-brand-dark/50 hover:text-brand-dark hover:underline mt-2">
        Signaler une erreur de solde
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            {envoye ? (
              <p className="text-sm font-semibold text-brand-greendark text-center py-4">Demande envoyée ✓</p>
            ) : (
              <form onSubmit={envoyer} className="space-y-3">
                <h2 className="font-bold text-brand-dark">Signaler un problème de solde</h2>
                <div className="rounded-xl bg-brand-cream/70 px-3 py-2 text-xs text-brand-dark/60">
                  Solde actuellement affiché : <strong>{soldeAfficheN} j en N</strong>
                  {soldeAfficheN1 !== undefined && <> · {soldeAfficheN1} j en N-1</>}
                </div>
                <p className="text-xs text-brand-dark/50">
                  Indiquez le solde que vous pensez devoir avoir (par exemple celui de votre fiche de paie) afin que l'employeur puisse vérifier et corriger rapidement.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Solde N réel</label>
                    <input type="number" step="0.01" value={soldeDeclareN} onChange={(e) => setSoldeDeclareN(e.target.value)} placeholder="optionnel" className="w-full px-2.5 py-2 rounded-xl border border-black/10 bg-brand-cream/60 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Solde N-1 réel</label>
                    <input type="number" step="0.01" value={soldeDeclareN1} onChange={(e) => setSoldeDeclareN1(e.target.value)} placeholder="optionnel" className="w-full px-2.5 py-2 rounded-xl border border-black/10 bg-brand-cream/60 text-sm outline-none" />
                  </div>
                </div>
                <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} placeholder="Précisez si besoin (optionnel)…" className="w-full px-3 py-2 rounded-xl border border-black/10 bg-brand-cream/60 text-sm outline-none resize-none" />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-1 bg-brand-dark text-brand-cream text-sm font-semibold py-2.5 rounded-xl">{loading ? "Envoi…" : "Signaler aux employeurs"}</button>
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
