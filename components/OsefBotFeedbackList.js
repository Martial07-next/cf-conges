"use client";

import { useMemo, useState } from "react";

export default function OsefBotFeedbackList({ retours }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return retours.filter((r) => {
      const statutOk =
        filtre === "tous" ||
        (filtre === "utile" && r.utile === true) ||
        (filtre === "ameliorer" && r.utile === false) ||
        (filtre === "sans-note" && r.utile === null);
      if (!statutOk) return false;
      if (!q) return true;
      return [r.question, r.reponse, r.commentaire, r.utilisateur]
        .filter(Boolean)
        .some((texte) => texte.toLowerCase().includes(q));
    });
  }, [retours, recherche, filtre]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-brand-night">
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une question, réponse, commentaire…" className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-brand-green dark:border-white/10" />
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["tous", "Tous"],
            ["utile", "👍 Utiles"],
            ["ameliorer", "👎 À améliorer"],
            ["sans-note", "Sans note"],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFiltre(id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filtre === id ? "bg-brand-green text-[#16231A]" : "bg-black/5 text-brand-dark/60 hover:bg-black/10 dark:bg-white/10"}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-brand-dark/40">{filtres.length} résultat{filtres.length > 1 ? "s" : ""}</p>
      </div>

      <div className="space-y-3">
        {filtres.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-sm text-brand-dark/50 dark:border-white/10">Aucun retour ne correspond à cette recherche.</div>
        ) : filtres.map((retour) => (
          <article key={retour.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-brand-night">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${retour.utile === true ? "bg-brand-green/15 text-brand-greendark" : retour.utile === false ? "bg-brand-yellow/20 text-brand-dark" : "bg-black/5 text-brand-dark/50 dark:bg-white/10"}`}>
                  {retour.utile === true ? "👍 Utile" : retour.utile === false ? "👎 À améliorer" : "Sans note"}
                </span>
                <span className="text-xs text-brand-dark/45">{retour.utilisateur}</span>
              </div>
              <span className="text-xs text-brand-dark/40">{retour.date}</span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.05]"><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark/40">Question</p><p className="text-sm text-brand-dark">{retour.question}</p></div>
              <div className="rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.05]"><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark/40">Réponse OSEFBOT</p><p className="text-sm leading-relaxed text-brand-dark">{retour.reponse}</p></div>
            </div>
            {retour.commentaire && <div className="mt-3 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">Commentaire utilisateur</p><p className="mt-1 text-sm text-brand-dark">{retour.commentaire}</p></div>}
          </article>
        ))}
      </div>
    </div>
  );
}
