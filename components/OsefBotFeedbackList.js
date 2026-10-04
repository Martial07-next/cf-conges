"use client";

import { useMemo, useState } from "react";

export default function OsefBotFeedbackList({ retours }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [apprentissage, setApprentissage] = useState(null);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [messageApprentissage, setMessageApprentissage] = useState("");

  async function apprendre() {
    if (!apprentissage?.reponse?.trim() || !apprentissage?.questionReference?.trim() || sauvegarde) return;
    setSauvegarde(true); setMessageApprentissage("");
    try {
      const res = await fetch("/api/admin/osefbot/knowledge", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({
        questionReference: apprentissage.questionReference,
        reponse: apprentissage.reponse,
        formulations: apprentissage.formulations.split("\n").map((x) => x.trim()).filter(Boolean),
        actionLabel: apprentissage.actionLabel,
        actionHref: apprentissage.actionHref,
      })});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessageApprentissage("Connaissance apprise par OSEFBOT ✓");
      setApprentissage(null);
    } catch (e) { setMessageApprentissage(e.message); } finally { setSauvegarde(false); }
  }

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

      {messageApprentissage && <div className="rounded-xl bg-brand-green/10 px-4 py-3 text-sm font-semibold text-brand-dark">{messageApprentissage}</div>}
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
            {retour.utile === false && <button type="button" onClick={() => { setMessageApprentissage(""); setApprentissage({ id:retour.id, questionReference:retour.question, reponse:"", formulations:"", actionLabel:"", actionHref:"" }); }} className="mt-3 rounded-xl bg-brand-green px-3 py-2 text-xs font-bold text-[#16231A]">Apprendre à OSEFBOT</button>}
            {apprentissage?.id === retour.id && <div className="mt-4 space-y-3 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4">
              <p className="text-sm font-bold text-brand-dark">Nouvelle connaissance</p>
              <input value={apprentissage.questionReference} onChange={(e)=>setApprentissage({...apprentissage,questionReference:e.target.value})} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-night" placeholder="Question de référence" />
              <textarea value={apprentissage.reponse} onChange={(e)=>setApprentissage({...apprentissage,reponse:e.target.value})} rows={4} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-night" placeholder="Bonne réponse à apprendre" />
              <textarea value={apprentissage.formulations} onChange={(e)=>setApprentissage({...apprentissage,formulations:e.target.value})} rows={3} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-night" placeholder={"Formulations similaires, une par ligne\nEx : comment mettre mes TT"} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={apprentissage.actionLabel} onChange={(e)=>setApprentissage({...apprentissage,actionLabel:e.target.value})} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-night" placeholder="Texte du bouton (facultatif)" />
                <input value={apprentissage.actionHref} onChange={(e)=>setApprentissage({...apprentissage,actionHref:e.target.value})} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-night" placeholder="/profil (facultatif)" />
              </div>
              <div className="flex gap-2"><button type="button" disabled={sauvegarde || !apprentissage.reponse.trim()} onClick={apprendre} className="rounded-xl bg-brand-green px-4 py-2 text-xs font-bold text-[#16231A] disabled:opacity-40">{sauvegarde ? "Apprentissage…" : "Enregistrer l’apprentissage"}</button><button type="button" onClick={()=>setApprentissage(null)} className="rounded-xl bg-black/5 px-4 py-2 text-xs font-semibold dark:bg-white/10">Annuler</button></div>
            </div>}
          </article>
        ))}
      </div>
    </div>
  );
}
