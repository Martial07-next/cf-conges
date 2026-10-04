"use client";

import { useState } from "react";
import Link from "next/link";

export default function OsefBot() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Salut 👋 Je suis OSEFBOT. Une question sur CF Congés ?" },
  ]);

  async function envoyer(e) {
    e?.preventDefault();
    const texte = message.trim();
    if (!texte || loading) return;
    setMessage("");
    setMessages((m) => [...m, { role: "user", text: texte }]);
    setLoading(true);
    try {
      const res = await fetch("/api/osefbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: texte }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: data.reponse || data.error || "Je n’ai pas réussi à répondre.",
          interactionId: data.interactionId || null,
          feedback: null,
          navigation: data.navigation || null,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Petit souci de connexion. Réessaie dans un instant." }]);
    } finally {
      setLoading(false);
    }
  }

  async function noter(index, utile) {
    const interaction = messages[index];
    if (!interaction?.interactionId || interaction.feedback !== null) return;

    try {
      const res = await fetch(`/api/osefbot/feedback/${interaction.interactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utile }),
      });
      if (!res.ok) return;

      setMessages((actuels) =>
        actuels.map((item, i) =>
          i === index ? { ...item, feedback: utile, commentaireFeedback: "", commentaireEnvoye: false } : item
        )
      );
    } catch {
      // Le feedback reste facultatif et ne doit jamais perturber le chat.
    }
  }

  async function envoyerCommentaire(index) {
    const interaction = messages[index];
    const commentaire = interaction?.commentaireFeedback?.trim();
    if (!interaction?.interactionId || interaction.feedback !== false || !commentaire) return;

    try {
      const res = await fetch(`/api/osefbot/feedback/${interaction.interactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utile: false, commentaire }),
      });
      if (!res.ok) return;
      setMessages((actuels) =>
        actuels.map((item, i) =>
          i === index ? { ...item, commentaireEnvoye: true } : item
        )
      );
    } catch {
      // Le commentaire est facultatif et ne doit jamais perturber le chat.
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {open && (
        <div className="mb-3 flex h-[520px] max-h-[70vh] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-brand-night">
          <div className="flex items-center justify-between bg-brand-green px-5 py-4 text-[#16231A]">
            <div>
              <p className="font-bold">OSEFBOT</p>
              <p className="text-[11px] font-medium opacity-70">Assistant CF Congés · lecture seule</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-lg hover:bg-black/10" aria-label="Fermer OSEFBOT">×</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-brand-green text-[#16231A]" : "bg-black/5 text-brand-dark dark:bg-white/10"}`}>
                    {m.text}
                  </div>
                  {m.role === "bot" && m.navigation && (
                    <Link href={m.navigation.href} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-3 py-2 text-xs font-bold text-[#16231A] transition hover:brightness-95">
                      {m.navigation.label} <span aria-hidden="true">→</span>
                    </Link>
                  )}
                  {m.role === "bot" && m.interactionId && (
                    <div className="mt-1.5 pl-1">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => noter(i, true)} disabled={m.feedback !== null} className={`rounded-lg px-2 py-1 text-sm transition hover:bg-black/5 dark:hover:bg-white/10 ${m.feedback === true ? "bg-brand-green/20" : "opacity-60"}`} aria-label="Réponse utile" title="Cette réponse m'a aidé">👍</button>
                        <button type="button" onClick={() => noter(i, false)} disabled={m.feedback !== null} className={`rounded-lg px-2 py-1 text-sm transition hover:bg-black/5 dark:hover:bg-white/10 ${m.feedback === false ? "bg-brand-green/20" : "opacity-60"}`} aria-label="Réponse non utile" title="Cette réponse ne m'a pas aidé">👎</button>
                        {m.feedback !== null && <span className="ml-1 text-[11px] opacity-50">Merci pour ton retour</span>}
                      </div>
                      {m.feedback === false && !m.commentaireEnvoye && (
                        <div className="mt-2 flex gap-1.5">
                          <input
                            value={m.commentaireFeedback || ""}
                            onChange={(e) => setMessages((actuels) => actuels.map((item, j) => j === i ? { ...item, commentaireFeedback: e.target.value } : item))}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); envoyerCommentaire(i); } }}
                            maxLength={500}
                            placeholder="Qu’est-ce qui n’allait pas ? (facultatif)"
                            className="min-w-0 flex-1 rounded-lg border border-black/10 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-brand-green dark:border-white/10"
                          />
                          <button type="button" onClick={() => envoyerCommentaire(i)} disabled={!m.commentaireFeedback?.trim()} className="rounded-lg bg-brand-green px-2.5 py-1.5 text-xs font-bold text-[#16231A] disabled:opacity-40">Envoyer</button>
                        </div>
                      )}
                      {m.feedback === false && m.commentaireEnvoye && <p className="mt-1.5 text-[11px] opacity-50">Commentaire enregistré, merci.</p>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <p className="text-xs text-brand-dark/40">OSEFBOT réfléchit…</p>}
          </div>

          <form onSubmit={envoyer} className="flex gap-2 border-t border-black/5 p-3 dark:border-white/10">
            <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} placeholder="Pose ta question…" className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-green dark:border-white/10" />
            <button disabled={loading || !message.trim()} className="rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-[#16231A] disabled:opacity-40">Envoyer</button>
          </form>
        </div>
      )}

      <button onClick={() => setOpen((v) => !v)} className="ml-auto flex h-14 items-center gap-2 rounded-full bg-brand-green px-4 font-bold text-[#16231A] shadow-xl transition hover:scale-[1.03] focus-ring" aria-label="Ouvrir OSEFBOT">
        <span className="text-xl">🤖</span>
        <span className="hidden sm:inline">OSEFBOT</span>
      </button>
    </div>
  );
}
