"use client";

import { useEffect, useState } from "react";
import { CATEGORIES_LIENS, categorieDepuisUrl } from "@/lib/liensUtiles";

const VIDE = { id: null, titre: "", url: "", categorie: "", description: "" };

function domaine(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Icône du site (favicon), remplacée par l'emoji de la catégorie si elle ne charge pas.
function IconeSite({ url, repli }) {
  const [erreur, setErreur] = useState(false);
  if (erreur) return <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base" aria-hidden>{repli}</span>;
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domaine(url)}&sz=64`}
      alt=""
      className="h-6 w-6 shrink-0 rounded"
      loading="lazy"
      onError={() => setErreur(true)}
    />
  );
}

// Bouton "Liens utiles" du tableau de bord : fenêtre avec les liens classés
// par catégorie. L'administrateur peut ajouter, modifier et supprimer.
export default function LiensUtiles({ estAdmin = false, variante = "bandeau" }) {
  const [ouvert, setOuvert] = useState(false);
  const [liens, setLiens] = useState(null);
  const [edition, setEdition] = useState(null); // null | objet lien en cours d'édition
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function charger() {
    const res = await fetch("/api/liens-utiles", { cache: "no-store" });
    setLiens(res.ok ? await res.json() : []);
  }

  useEffect(() => {
    if (ouvert && liens === null) charger();
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    const echap = (e) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [ouvert]);

  async function enregistrer(e) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    const res = await fetch("/api/liens-utiles", {
      method: edition.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edition),
    });
    setChargement(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error || "Erreur.");
      return;
    }
    setEdition(null);
    await charger();
  }

  async function supprimer(lien) {
    if (!confirm(`Supprimer le lien « ${lien.titre} » ?`)) return;
    await fetch("/api/liens-utiles", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lien.id }) });
    await charger();
  }

  const parCategorie = Object.keys(CATEGORIES_LIENS)
    .map((cle) => ({ cle, ...CATEGORIES_LIENS[cle], liens: (liens || []).filter((l) => l.categorie === cle) }))
    .filter((c) => c.liens.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={
          variante === "bandeau"
            ? "inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-[#EBF0E8] transition hover:bg-white/10"
            : "inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-brand-dark hover:bg-black/5"
        }
      >
        🔗 Liens utiles
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4" onClick={() => setOuvert(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-black/5 bg-white shadow-2xl sm:rounded-3xl dark:border-white/10 dark:bg-brand-night"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Liens utiles"
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10">
              <div>
                <h2 className="font-display text-base font-bold text-brand-dark">🔗 Liens utiles</h2>
                <p className="text-xs text-brand-dark/50">Sites, vidéos, documents et outils de CF Réseaux.</p>
              </div>
              <button type="button" onClick={() => setOuvert(false)} className="rounded-lg px-2 py-1 text-lg text-brand-dark/50 hover:bg-black/5" aria-label="Fermer">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {liens === null ? (
                <p className="py-6 text-center text-sm text-brand-dark/50">Chargement…</p>
              ) : parCategorie.length === 0 && !edition ? (
                <p className="py-6 text-center text-sm text-brand-dark/50">{estAdmin ? "Aucun lien pour l'instant : ajoutez le premier." : "Aucun lien pour l'instant."}</p>
              ) : (
                <div className="space-y-5">
                  {parCategorie.map((c) => (
                    <div key={c.cle}>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">
                        {c.icone} {c.label}
                      </p>
                      <ul className="space-y-2">
                        {c.liens.map((l) => (
                          <li key={l.id} className="group flex items-center gap-2">
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-black/5 bg-black/[0.02] px-3 py-2.5 transition hover:border-brand-green/50 hover:bg-brand-green/10 dark:border-white/10 dark:bg-white/5"
                            >
                              <IconeSite url={l.url} repli={c.icone} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-brand-dark">{l.titre}</span>
                                <span className="block truncate text-xs text-brand-dark/50">{l.description || domaine(l.url)}</span>
                              </span>
                              <span className="text-brand-dark/30" aria-hidden>↗</span>
                            </a>
                            {estAdmin && (
                              <span className="flex shrink-0 flex-col gap-1">
                                <button type="button" onClick={() => { setEdition({ ...l, description: l.description || "" }); setErreur(""); }} className="rounded-md px-1.5 text-xs text-brand-dark/50 hover:bg-black/5" title="Modifier">
                                  ✎
                                </button>
                                <button type="button" onClick={() => supprimer(l)} className="rounded-md px-1.5 text-xs text-alert-soft hover:bg-alert-soft/10" title="Supprimer">
                                  🗑
                                </button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {estAdmin && edition && (
                <form onSubmit={enregistrer} className="mt-5 space-y-3 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4">
                  <p className="text-sm font-bold text-brand-dark">{edition.id ? "Modifier le lien" : "Nouveau lien"}</p>
                  <input
                    required
                    type="url"
                    value={edition.url}
                    onChange={(e) => setEdition((x) => ({ ...x, url: e.target.value, categorie: x.categorie || "" }))}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus-ring outline-none dark:bg-white/5"
                  />
                  <input
                    required
                    value={edition.titre}
                    onChange={(e) => setEdition((x) => ({ ...x, titre: e.target.value }))}
                    placeholder="Titre (ex. Site CF Réseaux)"
                    maxLength={100}
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus-ring outline-none dark:bg-white/5"
                  />
                  <input
                    value={edition.description}
                    onChange={(e) => setEdition((x) => ({ ...x, description: e.target.value }))}
                    placeholder="Description courte (facultatif)"
                    maxLength={200}
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus-ring outline-none dark:bg-white/5"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(CATEGORIES_LIENS).map(([cle, c]) => {
                      const actif = (edition.categorie || categorieDepuisUrl(edition.url)) === cle;
                      return (
                        <button
                          key={cle}
                          type="button"
                          onClick={() => setEdition((x) => ({ ...x, categorie: cle }))}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${actif ? "border-brand-dark bg-brand-dark text-brand-cream dark:border-brand-green dark:bg-brand-green dark:text-[#16231a]" : "border-black/10 text-brand-dark/70 hover:bg-black/5"}`}
                        >
                          {c.icone} {c.label}
                        </button>
                      );
                    })}
                  </div>
                  {erreur && <p className="text-xs text-alert-soft">{erreur}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={chargement} className="rounded-xl bg-brand-green px-3.5 py-2 text-xs font-bold text-[#16231A] disabled:opacity-50">
                      {chargement ? "…" : "Enregistrer"}
                    </button>
                    <button type="button" onClick={() => setEdition(null)} className="rounded-xl border border-black/10 px-3.5 py-2 text-xs font-semibold text-brand-dark/60">
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>

            {estAdmin && !edition && (
              <div className="border-t border-black/5 px-5 py-3 dark:border-white/10">
                <button type="button" onClick={() => { setEdition({ ...VIDE }); setErreur(""); }} className="w-full rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-[#16231A] hover:bg-brand-greendark hover:text-white">
                  + Ajouter un lien
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
