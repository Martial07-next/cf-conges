"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

export default function BugReportButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/bug-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, page: pathname }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur.");
      return;
    }
    setSent(true);
    setMessage("");
    setTimeout(() => {
      setOpen(false);
      setSent(false);
    }, 1500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-5 z-40 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg transition-colors"
      >
        ⚠ Signaler un problème
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-6 w-full max-w-sm">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3 text-xl">✓</div>
                <p className="font-semibold text-brand-dark">Merci, c'est envoyé.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-brand-dark">Signaler un problème</h2>
                  <button type="button" onClick={() => setOpen(false)} className="text-brand-dark/40 hover:text-brand-dark text-lg leading-none">
                    ×
                  </button>
                </div>
                <p className="text-xs text-brand-dark/50">
                  Décrivez ce qui ne fonctionne pas, ça part directement à l'administrateur.
                </p>
                <textarea
                  required
                  autoFocus
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex : le bouton Valider ne répond pas sur la page Employeur…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm outline-none resize-none"
                />
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {loading ? "Envoi…" : "Envoyer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-black/10 text-sm font-semibold text-brand-dark hover:bg-black/5"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
