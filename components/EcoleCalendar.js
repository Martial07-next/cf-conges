"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function joursDuMois(annee, mois) {
  const premier = new Date(annee, mois, 1);
  const dernier = new Date(annee, mois + 1, 0);
  const decalage = premier.getDay() === 0 ? 6 : premier.getDay() - 1; // semaine commence lundi
  const cases = [];
  for (let i = 0; i < decalage; i++) cases.push(null);
  for (let j = 1; j <= dernier.getDate(); j++) cases.push(new Date(annee, mois, j));
  return cases;
}

export default function EcoleCalendar({ entries }) {
  const router = useRouter();
  const today = new Date();
  const [annee, setAnnee] = useState(today.getFullYear());
  const [mois, setMois] = useState(today.getMonth());
  const [modePlage, setModePlage] = useState(false);
  const [debutPlage, setDebutPlage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function estEcole(jour) {
    if (!jour) return false;
    return entries.some((e) => jour >= new Date(e.dateDebut) && jour <= new Date(e.dateFin));
  }

  async function ajouterJours(dateDebut, dateFin) {
    setLoading(true);
    const res = await fetch("/api/ecole", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateDebut, dateFin }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("Ajouté ✓");
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(data.error || "Erreur.");
    }
    setTimeout(() => setMessage(""), 2000);
  }

  function handleClickJour(jour) {
    if (!jour || loading) return;

    if (modePlage) {
      if (!debutPlage) {
        setDebutPlage(jour);
        return;
      }
      const [debut, fin] = jour < debutPlage ? [jour, debutPlage] : [debutPlage, jour];
      ajouterJours(toISODate(debut), toISODate(fin));
      setDebutPlage(null);
      setModePlage(false);
      return;
    }

    if (estEcole(jour)) return; // deja ecole -> retrait via la liste en dessous du calendrier
    ajouterJours(toISODate(jour), toISODate(jour));
  }

  function moisPrecedent() {
    if (mois === 0) { setAnnee((a) => a - 1); setMois(11); } else { setMois((m) => m - 1); }
  }
  function moisSuivant() {
    if (mois === 11) { setAnnee((a) => a + 1); setMois(0); } else { setMois((m) => m + 1); }
  }

  const cases = joursDuMois(annee, mois);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={moisPrecedent} className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/5 text-brand-dark">‹</button>
          <span className="text-sm font-semibold text-brand-dark w-32 text-center">{MOIS[mois]} {annee}</span>
          <button type="button" onClick={moisSuivant} className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/5 text-brand-dark">›</button>
        </div>
        <button
          type="button"
          onClick={() => { setModePlage((v) => !v); setDebutPlage(null); }}
          className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
            modePlage ? "bg-brand-dark text-brand-cream" : "bg-brand-green/15 text-brand-greendark hover:bg-brand-green/25"
          }`}
        >
          {modePlage ? (debutPlage ? "Cliquez le dernier jour…" : "Cliquez le premier jour…") : "+ Ajouter une plage"}
        </button>
      </div>

      {!modePlage && <p className="text-xs text-brand-dark/50 mb-3">Cliquez directement sur un jour pour l'ajouter en école.</p>}

      <div className="grid grid-cols-7 gap-1.5">
        {JOURS.map((j, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-brand-dark/40 pb-1">{j}</div>
        ))}
        {cases.map((jour, i) => {
          const ecole = estEcole(jour);
          const isDebutSelectionne = debutPlage && jour && toISODate(jour) === toISODate(debutPlage);
          return (
            <button
              type="button"
              key={i}
              disabled={!jour || loading}
              onClick={() => handleClickJour(jour)}
              className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                !jour
                  ? "invisible"
                  : isDebutSelectionne
                  ? "bg-brand-dark text-brand-cream"
                  : ecole
                  ? "bg-brand-yellow/60 text-brand-dark font-bold"
                  : "bg-black/[0.03] hover:bg-brand-green/20 text-brand-dark/70"
              }`}
            >
              {jour?.getDate()}
            </button>
          );
        })}
      </div>

      {message && <p className="text-xs text-brand-greendark mt-3">{message}</p>}
    </div>
  );
}
