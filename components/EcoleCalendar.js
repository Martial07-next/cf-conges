"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { estJourFerie } from "@/lib/joursFeries";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["L", "M", "M", "J", "V"];

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function joursDuMois(annee, mois) {
  const premier = new Date(annee, mois, 1);
  const dernier = new Date(annee, mois + 1, 0);

  let premierOuvre = new Date(premier);
  while (premierOuvre.getDay() === 0 || premierOuvre.getDay() === 6) {
    premierOuvre.setDate(premierOuvre.getDate() + 1);
  }
  const decalage = premierOuvre.getMonth() === mois ? premierOuvre.getDay() - 1 : 0;

  const cases = [];
  for (let i = 0; i < decalage; i++) cases.push(null);
  for (let j = 1; j <= dernier.getDate(); j++) {
    const d = new Date(annee, mois, j);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    cases.push(d);
  }
  return cases;
}

export default function EcoleCalendar({ entries, couleur = "#63B3C9" }) {
  const router = useRouter();
  const today = new Date();
  const [annee, setAnnee] = useState(today.getFullYear());
  const [mois, setMois] = useState(today.getMonth());
  const [modePlage, setModePlage] = useState(false);
  const [modeSuppression, setModeSuppression] = useState(false);
  const [debutPlage, setDebutPlage] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [message, setMessage] = useState("");

  function estEcole(jour) {
    if (!jour) return false;
    const key = toISODate(jour);
    return entries.some((e) => {
      const debut = toISODate(new Date(e.dateDebut));
      const fin = toISODate(new Date(e.dateFin));
      return key >= debut && key <= fin;
    });
  }

  async function ajouterJours(dateDebut, dateFin, cle) {
    setEnCours(cle);
    const res = await fetch("/api/ecole", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateDebut, dateFin }),
    });
    setEnCours(null);
    const data = await res.json();
    if (res.ok) {
      setMessage("Ajouté ✓");
      router.refresh();
    } else {
      setMessage(data.error || "Erreur.");
    }
    setTimeout(() => setMessage(""), 2500);
  }

  async function retirerJour(jour) {
    const cle = toISODate(jour);
    setEnCours(cle);
    const res = await fetch("/api/ecole/jour", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: cle }),
    });
    setEnCours(null);
    const data = await res.json();
    if (res.ok) {
      setMessage("Jour retiré ✓");
      router.refresh();
    } else {
      setMessage(data.error || "Erreur.");
    }
    setTimeout(() => setMessage(""), 2500);
  }

  function handleClickJour(jour) {
    if (!jour || enCours) return;
    const ferie = estJourFerie(jour);

    if (modeSuppression) {
      if (!estEcole(jour)) return;
      retirerJour(jour);
      return;
    }

    if (modePlage) {
      if (!debutPlage) {
        setDebutPlage(jour);
        return;
      }
      const [debut, fin] = jour < debutPlage ? [jour, debutPlage] : [debutPlage, jour];
      ajouterJours(toISODate(debut), toISODate(fin), `${toISODate(debut)}_${toISODate(fin)}`);
      setDebutPlage(null);
      setModePlage(false);
      return;
    }

    if (ferie) {
      setMessage(`${ferie.libelle} — pas de cours ce jour-là.`);
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    if (estEcole(jour)) return;
    ajouterJours(toISODate(jour), toISODate(jour), toISODate(jour));
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setModePlage((v) => !v); setModeSuppression(false); setDebutPlage(null); }}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${modePlage ? "bg-brand-dark text-brand-cream" : "hover:opacity-80"}`}
            style={!modePlage ? { backgroundColor: `${couleur}22`, color: couleur } : undefined}
          >
            {modePlage ? (debutPlage ? "Cliquez le dernier jour…" : "Cliquez le premier jour…") : "+ Ajouter une plage"}
          </button>
          <button
            type="button"
            onClick={() => { setModeSuppression((v) => !v); setModePlage(false); setDebutPlage(null); }}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              modeSuppression ? "bg-alert-soft text-white" : "bg-alert-soft/10 text-alert-soft hover:bg-alert-soft/20"
            }`}
          >
            {modeSuppression ? "Cliquez le jour à retirer…" : "🗑 Supprimer un jour"}
          </button>
        </div>
      </div>

      {!modePlage && !modeSuppression && <p className="text-xs text-brand-dark/50 mb-3">Cliquez directement sur un jour pour l'ajouter en école.</p>}
      {modeSuppression && <p className="text-xs text-alert-soft mb-3">Cliquez un jour en école (en couleur) pour le retirer, même au milieu d'une période.</p>}

      <div className="grid grid-cols-5 gap-1.5">
        {JOURS.map((j, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-brand-dark/40 pb-1">{j}</div>
        ))}
        {cases.map((jour, i) => {
          if (!jour) return <div key={i} className="invisible" />;

          const key = toISODate(jour);
          const ecole = estEcole(jour);
          const ferie = estJourFerie(jour);
          const isDebutSelectionne = debutPlage && toISODate(debutPlage) === key;
          const chargement = enCours === key || (enCours && enCours.includes(key));

          return (
            <button
              type="button"
              key={i}
              disabled={chargement}
              title={ferie ? ferie.libelle : undefined}
              onClick={() => handleClickJour(jour)}
              className={`relative flex flex-col items-center justify-center rounded-lg h-14 text-sm font-medium transition-colors ${
                isDebutSelectionne
                  ? "bg-brand-dark text-brand-cream"
                  : ferie && !ecole
                  ? "bg-brand-yellow/10 text-brand-dark/30"
                  : !ecole
                  ? "bg-black/[0.03] hover:bg-black/[0.06] text-brand-dark/70"
                  : modeSuppression
                  ? "ring-2 ring-alert-soft"
                  : ""
              } ${chargement ? "opacity-50" : ""}`}
              style={ecole && !isDebutSelectionne ? { backgroundColor: `${couleur}33`, color: couleur } : undefined}
            >
              <span className="font-bold">{jour.getDate()}</span>
              {ecole && <span className="text-[9px] font-semibold leading-none mt-0.5">École</span>}
              {ferie && !ecole && <span className="text-[8px] leading-none mt-0.5">Férié</span>}
            </button>
          );
        })}
      </div>

      {message && <p className="text-xs text-brand-greendark mt-3">{message}</p>}
    </div>
  );
}
