"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";

export default function ComptableTable({ lignes }) {
  const [recherche, setRecherche] = useState("");
  const [pole, setPole] = useState("");
  const [controle, setControle] = useState("");

  const poles = useMemo(
    () => [...new Set(lignes.map((ligne) => ligne.pole).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")),
    [lignes]
  );

  const lignesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr");
    return lignes.filter((ligne) => {
      const nom = `${ligne.prenom} ${ligne.nom}`.toLocaleLowerCase("fr");
      if (terme && !nom.includes(terme)) return false;
      if (pole && ligne.pole !== pole) return false;
      if (controle === "conforme" && ligne.controles.length > 0) return false;
      if (controle === "alerte" && ligne.controles.length === 0) return false;
      return true;
    });
  }, [lignes, recherche, pole, controle]);

  const filtresActifs = recherche || pole || controle;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-black/5 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-bold text-brand-dark">Situation des collaborateurs</h2>
            <p className="mt-0.5 text-xs text-brand-dark/45">Vue de contrôle des compteurs et tickets restaurant</p>
          </div>
          <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-brand-dark/60">
            {lignesFiltrees.length} sur {lignes.length} dossier{lignes.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-dark/35">⌕</span>
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un collaborateur"
              className="w-full rounded-xl border border-black/10 bg-brand-cream/40 py-2.5 pl-9 pr-3 text-sm text-brand-dark outline-none focus:border-brand-green"
            />
          </div>
          <select value={pole} onChange={(e) => setPole(e.target.value)} className="rounded-xl border border-black/10 bg-brand-cream/40 px-3 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-green">
            <option value="">Tous les pôles</option>
            {poles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={controle} onChange={(e) => setControle(e.target.value)} className="rounded-xl border border-black/10 bg-brand-cream/40 px-3 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-green">
            <option value="">Tous les contrôles</option>
            <option value="conforme">Conformes</option>
            <option value="alerte">À contrôler</option>
          </select>
          {filtresActifs && (
            <button type="button" onClick={() => { setRecherche(""); setPole(""); setControle(""); }} className="rounded-xl px-3 py-2 text-xs font-bold text-brand-dark/55 hover:bg-black/5">
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-left">
          <thead className="bg-black/[0.03]">
            <tr className="text-[10px] font-bold uppercase tracking-wide text-brand-dark/45">
              <th className="px-4 py-3">Collaborateur</th>
              <th className="px-3 py-3">Acquis campagne</th>
              <th className="px-3 py-3">Pris campagne</th>
              <th className="px-3 py-3">Solde campagne</th>
              <th className="px-3 py-3">Autres compteurs</th>
              <th className="px-3 py-3 text-center">Tickets</th>
              <th className="px-4 py-3 text-right">Contrôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {lignesFiltrees.map((ligne) => (
              <tr key={ligne.id} className="hover:bg-black/[0.025]">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-brand-dark">{ligne.prenom} {ligne.nom}</p>
                  <p className="text-[11px] text-brand-dark/45">{ligne.pole || "Pôle non renseigné"}</p>
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-brand-dark">{ligne.acquis} j</td>
                <td className="px-3 py-3 text-sm font-semibold text-brand-dark/70">{ligne.pris} j</td>
                <td className="px-3 py-3 text-sm font-bold text-brand-dark">{ligne.disponible} j</td>
                <td className="px-3 py-3">
                  {ligne.autresCompteurs.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {ligne.autresCompteurs.map((item) => (
                        <span key={item.id} className="rounded-md bg-black/5 px-2 py-1 text-[10px] font-semibold text-brand-dark/65">{item.code} {item.valeur}</span>
                      ))}
                    </div>
                  ) : <span className="text-xs text-brand-dark/30">Aucun</span>}
                  {ligne.enfantMalade && (ligne.enfantMalade.remuneres > 0 || ligne.enfantMalade.nonRemuneres > 0) && (
                    <div className="mt-2 rounded-lg border border-black/10 px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-brand-dark/50">Enfant malade</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {ligne.enfantMalade.remuneres > 0 && (
                          <span className="rounded-md bg-[rgb(10_254_107)]/15 px-2 py-1 text-[10px] font-bold text-brand-dark">
                            {ligne.enfantMalade.remuneres} j rémunéré{ligne.enfantMalade.remuneres > 1 ? "s" : ""}
                          </span>
                        )}
                        {ligne.enfantMalade.nonRemuneres > 0 && (
                          <span className="rounded-md bg-black/5 px-2 py-1 text-[10px] font-bold text-brand-dark/70">
                            {ligne.enfantMalade.nonRemuneres} j non rémunéré{ligne.enfantMalade.nonRemuneres > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex min-w-10 justify-center rounded-lg bg-[rgb(10_254_107)]/15 px-2 py-1 text-xs font-bold text-brand-dark">{ligne.tickets}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1.5">
                    {ligne.controles.length > 0 ? (
                      <span className="inline-flex rounded-full bg-brand-yellow/20 px-2 py-1 text-[10px] font-bold text-brand-dark">
                        {ligne.controles.length} point{ligne.controles.length > 1 ? "s" : ""} à contrôler
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[rgb(10_254_107)]/15 px-2 py-1 text-[10px] font-bold text-brand-dark">Conforme</span>
                    )}
                    <Link href={`/mon-solde?userId=${ligne.id}`} className="text-xs font-bold text-brand-greendark hover:underline">Ouvrir →</Link>
                  </div>
                </td>
              </tr>
            ))}
            {lignesFiltrees.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-brand-dark/45">Aucun collaborateur ne correspond aux filtres.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
