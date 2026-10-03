"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState } from "./ui";
import EcoleCalendar from "./EcoleCalendar";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function AlternantSection({ entries, tuteurs, tuteurActuelId, couleur }) {
  const router = useRouter();
  const [tuteurId, setTuteurId] = useState(tuteurActuelId || "");

  async function handleDelete(id) {
    if (!confirm("Retirer cette période école ?")) return;
    const res = await fetch(`/api/ecole/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function handleTuteurChange(id) {
    setTuteurId(id);
    await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tuteurId: id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="font-bold text-brand-dark mb-1">Mon tuteur</h2>
        <p className="text-sm text-brand-dark/60 mb-4">Il pourra suivre vos périodes école depuis son propre espace.</p>
        <select
          value={tuteurId}
          onChange={(e) => handleTuteurChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none min-w-[240px]"
        >
          <option value="">Choisir un tuteur</option>
          {tuteurs.map((t) => (
            <option key={t.id} value={t.id}>{t.prenom} {t.nom}{t.service ? ` & ${t.service}` : ""}</option>
          ))}
        </select>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold text-brand-dark mb-4">Mes jours d'école</h2>
        <EcoleCalendar entries={entries} couleur={couleur} />
      </Card>

      <Card>
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Périodes enregistrées</h2>
        </div>
        {entries.length === 0 ? (
          <EmptyState title="Aucune période école ajoutée" />
        ) : (
          <ul className="divide-y divide-black/5">
            {entries.map((e) => (
              <li key={e.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                                <span className="text-sm text-brand-dark">
                  {formatDate(e.dateDebut)}
                  {formatDate(e.dateDebut) !== formatDate(e.dateFin) && ` → ${formatDate(e.dateFin)}`}
                </span>
                <button onClick={() => handleDelete(e.id)} className="text-xs font-semibold text-alert-soft hover:underline">Retirer</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function TuteurSection({ alternants, couleur }) {
  const [alternantActifId, setAlternantActifId] = useState(alternants[0]?.id || null);
  const alternantActif = alternants.find((a) => a.id === alternantActifId) || alternants[0];

  function debutJour(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function estDansPeriode(r, date) {
    const jour = debutJour(date);
    return debutJour(r.dateDebut) <= jour && debutJour(r.dateFin) >= jour;
  }

  function prochainePeriode(a) {
    const today = debutJour();
    return a.leaveRequests.find((r) => debutJour(r.dateFin) >= today) || null;
  }

  function joursAvant(r) {
    if (!r) return null;
    return Math.max(0, Math.ceil((debutJour(r.dateDebut) - debutJour()) / 86400000));
  }

  if (alternants.length === 0) {
    return (
      <Card>
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-brand-dark">Suivi de mes alternants</h2>
        </div>
        <EmptyState title="Aucun alternant ne vous a encore choisi comme tuteur" />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-brand-dark">Mes alternants</h2>
        <p className="text-sm text-brand-dark/50 mt-1">Visualisez rapidement qui est en entreprise, à l'école et les prochaines périodes.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alternants.map((a) => {
          const prochaine = prochainePeriode(a);
          const aLEcole = prochaine && estDansPeriode(prochaine, new Date());
          const delai = joursAvant(prochaine);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAlternantActifId(a.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                alternantActif?.id === a.id
                  ? "border-[rgb(10_254_107)] bg-[rgb(10_254_107)]/10 shadow-sm"
                  : "border-black/10 bg-white hover:border-black/20 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-brand-dark">{a.prenom} {a.nom}</p>
                  {(a.pole || a.service) && <p className="text-xs text-brand-dark/45 mt-0.5">{a.pole || a.service}</p>}
                </div>
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${aLEcole ? "bg-[#63B3C9]" : "bg-[rgb(10_254_107)]"}`} />
              </div>
              <p className="text-xs font-semibold text-brand-dark mt-4">
                {aLEcole ? "À l'école aujourd'hui" : "En entreprise aujourd'hui"}
              </p>
              <p className="text-xs text-brand-dark/50 mt-1">
                {!prochaine
                  ? "Aucune prochaine période renseignée"
                  : aLEcole
                  ? `École jusqu'au ${formatDate(prochaine.dateFin)}`
                  : `Prochaine école : ${formatDate(prochaine.dateDebut)}${formatDate(prochaine.dateDebut) !== formatDate(prochaine.dateFin) ? ` → ${formatDate(prochaine.dateFin)}` : ""}${delai > 0 ? ` · dans ${delai} j` : ""}`}
              </p>
            </button>
          );
        })}
      </div>

      {alternantActif && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/40">Suivi école</p>
              <h3 className="text-lg font-bold text-brand-dark mt-1">{alternantActif.prenom} {alternantActif.nom}</h3>
            </div>
            <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-brand-dark/60">Lecture seule</span>
          </div>

          <TuteurCalendar entries={alternantActif.leaveRequests} couleur={couleur} />

          <div className="mt-6 border-t border-black/5 pt-5">
            <h4 className="text-sm font-bold text-brand-dark mb-3">Prochaines périodes école</h4>
            {alternantActif.leaveRequests.filter((r) => debutJour(r.dateFin) >= debutJour()).length === 0 ? (
              <p className="text-sm text-brand-dark/40">Aucune prochaine période renseignée.</p>
            ) : (
              <div className="space-y-2">
                {alternantActif.leaveRequests.filter((r) => debutJour(r.dateFin) >= debutJour()).slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl bg-black/[0.025] px-3.5 py-3">
                    <span className="h-9 w-1 rounded-full" style={{ backgroundColor: couleur }} />
                    <div>
                      <p className="text-sm font-semibold text-brand-dark">
                        {formatDate(r.dateDebut)}
                        {formatDate(r.dateDebut) !== formatDate(r.dateFin) && ` → ${formatDate(r.dateFin)}`}
                      </p>
                      <p className="text-xs text-brand-dark/45 mt-0.5">
                        {estDansPeriode(r, new Date()) ? "En cours actuellement" : `Dans ${joursAvant(r)} jour${joursAvant(r) > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function TuteurCalendar({ entries, couleur }) {
  const today = new Date();
  const [annee, setAnnee] = useState(today.getFullYear());
  const [mois, setMois] = useState(today.getMonth());
  const moisLabels = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const jours = ["L", "M", "M", "J", "V"];

  function iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function estEcole(d) {
    const key = iso(d);
    return entries.some((r) => key >= iso(new Date(r.dateDebut)) && key <= iso(new Date(r.dateFin)));
  }

  const premier = new Date(annee, mois, 1);
  const dernier = new Date(annee, mois + 1, 0);
  const cases = [];
  let premierOuvre = new Date(premier);
  while (premierOuvre.getDay() === 0 || premierOuvre.getDay() === 6) premierOuvre.setDate(premierOuvre.getDate() + 1);
  const decalage = premierOuvre.getMonth() === mois ? premierOuvre.getDay() - 1 : 0;
  for (let i = 0; i < decalage; i++) cases.push(null);
  for (let j = 1; j <= dernier.getDate(); j++) {
    const d = new Date(annee, mois, j);
    if (d.getDay() !== 0 && d.getDay() !== 6) cases.push(d);
  }

  function precedent() {
    if (mois === 0) { setMois(11); setAnnee((a) => a - 1); } else setMois((m) => m - 1);
  }
  function suivant() {
    if (mois === 11) { setMois(0); setAnnee((a) => a + 1); } else setMois((m) => m + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={precedent} className="w-9 h-9 rounded-xl border border-black/10 text-brand-dark hover:bg-black/5">‹</button>
        <p className="text-sm font-bold text-brand-dark">{moisLabels[mois]} {annee}</p>
        <button type="button" onClick={suivant} className="w-9 h-9 rounded-xl border border-black/10 text-brand-dark hover:bg-black/5">›</button>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {jours.map((j, i) => <div key={i} className="pb-1 text-center text-[11px] font-semibold text-brand-dark/40">{j}</div>)}
        {cases.map((d, i) => {
          if (!d) return <div key={i} />;
          const ecole = estEcole(d);
          const estAujourdhui = iso(d) === iso(today);
          return (
            <div
              key={i}
              className={`h-12 sm:h-14 rounded-lg flex flex-col items-center justify-center text-sm relative ${!ecole ? "bg-black/[0.025] text-brand-dark/60" : "font-bold"} ${estAujourdhui ? "ring-2 ring-[rgb(10_254_107)] ring-offset-1" : ""}`}
              style={ecole ? { backgroundColor: `${couleur}33`, color: couleur } : undefined}
            >
              <span>{d.getDate()}</span>
              {ecole && <span className="text-[8px] sm:text-[9px] leading-none mt-0.5">École</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-brand-dark/50">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: couleur }} /> École</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[rgb(10_254_107)]" /> Aujourd'hui</span>
      </div>
    </div>
  );
}
