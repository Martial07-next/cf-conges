"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const TZ = "Europe/Paris";

// Heure de Paris décomposée.
function partiesParis(date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "long", day: "numeric", month: "long", year: "numeric", hourCycle: "h23" })
      .formatToParts(date)
      .map((x) => [x.type, x.value])
  );
  return { ...p, h: Number(p.hour), m: Number(p.minute), s: Number(p.second) };
}

function salutation(h) {
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

// Journée de travail : 8h-12h puis 13h-17h (même découpage qu'« Équipe en direct »).
function journee(p, jourSemaine) {
  const minutes = p.h * 60 + p.m + p.s / 60;
  const debut = 8 * 60, pauseDebut = 12 * 60, pauseFin = 13 * 60, fin = 17 * 60;
  const total = (pauseDebut - debut) + (fin - pauseFin);
  const weekend = jourSemaine === "samedi" || jourSemaine === "dimanche";
  let fait = 0;
  if (minutes > debut) fait += Math.min(minutes, pauseDebut) - debut;
  if (minutes > pauseFin) fait += Math.min(minutes, fin) - pauseFin;
  const pourcent = Math.max(0, Math.min(100, (fait / total) * 100));
  const restant = (cible) => {
    const r = Math.max(0, Math.round(cible - minutes));
    return r >= 60 ? `${Math.floor(r / 60)}h${String(r % 60).padStart(2, "0")}` : `${r} min`;
  };
  if (weekend) return { pourcent: 0, texte: "C'est le week-end, profitez-en 😎" };
  if (minutes < debut) return { pourcent: 0, texte: `La journée commence dans ${restant(debut)}` };
  if (minutes < pauseDebut) return { pourcent, texte: `Pause déjeuner dans ${restant(pauseDebut)}` };
  if (minutes < pauseFin) return { pourcent, texte: `Pause déjeuner · reprise dans ${restant(pauseFin)} 🍽️` };
  if (minutes < fin) return { pourcent, texte: `Fin de journée dans ${restant(fin)}` };
  return { pourcent: 100, texte: "Journée terminée, bonne soirée ✨" };
}

function numeroSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jour);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
}

// Bandeau d'accueil du tableau de bord : horloge en direct, salutation selon
// l'heure, progression de la journée et chiffres clés, dans la DA CF Réseaux.
export default function DashboardHero({ prenom, sousTitre, stats = [], actions = [] }) {
  const [maintenant, setMaintenant] = useState(null);

  useEffect(() => {
    setMaintenant(new Date());
    const id = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const p = maintenant ? partiesParis(maintenant) : null;
  const j = p ? journee(p, p.weekday) : { pourcent: 0, texte: "" };
  const date = p ? `${p.weekday.charAt(0).toUpperCase() + p.weekday.slice(1)} ${p.day} ${p.month} ${p.year}` : " ";

  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl md:mt-8 bg-[#0E1712] text-[#EBF0E8] shadow-[0_20px_60px_-25px_rgba(10,254,107,0.35)]">
      {/* Décor : halo vert, trame et éclair discrets */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#0afe6b]/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#fff200]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <svg viewBox="0 0 24 24" className="absolute -right-6 bottom-0 h-56 w-56 text-[#0afe6b]/[0.07]" fill="currentColor">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      </div>

      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0afe6b]/30 bg-[#0afe6b]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0afe6b]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0afe6b] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0afe6b]" />
            </span>
            CF Réseaux · Congés
          </p>
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
            {p ? salutation(p.h) : "Bonjour"} {prenom} 👋
          </h1>
          <p className="mt-1 text-sm text-[#EBF0E8]/60">{sousTitre}</p>

          {actions.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={
                    i === 0
                      ? "inline-flex items-center gap-2 rounded-xl bg-[#0afe6b] px-4 py-2.5 text-sm font-bold text-[#0E1712] shadow-lg shadow-[#0afe6b]/20 transition hover:scale-[1.02] hover:bg-[#3dff8c]"
                      : "inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-[#EBF0E8] transition hover:bg-white/10"
                  }
                >
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Horloge en direct */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-left backdrop-blur-sm lg:min-w-[300px] lg:text-right">
          <div className="font-mono text-5xl font-bold tabular-nums tracking-tight sm:text-6xl" suppressHydrationWarning>
            {p ? (
              <>
                {p.hour}
                <span className="animate-pulse text-[#0afe6b]">:</span>
                {p.minute}
                <span className="ml-1 align-top text-xl text-[#EBF0E8]/40 sm:text-2xl">{p.second}</span>
              </>
            ) : (
              "--:--"
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-[#EBF0E8]/70">{date}</p>
          {maintenant && <p className="text-xs text-[#EBF0E8]/40">Semaine {numeroSemaine(maintenant)}</p>}
        </div>
      </div>

      {/* Progression de la journée */}
      <div className="relative px-6 pb-6 sm:px-8">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-[#EBF0E8]/80">{j.texte}</span>
          <span className="tabular-nums text-[#EBF0E8]/40">{Math.round(j.pourcent)} %</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0afe6b] to-[#fff200] transition-[width] duration-1000"
            style={{ width: `${j.pourcent}%` }}
          />
          {/* Repère de la pause déjeuner (après 4 h sur 8) */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-[#0E1712]/70" title="Pause déjeuner" />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-[#EBF0E8]/35">
          <span>8h</span>
          <span>12h · 13h</span>
          <span>17h</span>
        </div>

        {stats.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => {
              const contenu = (
                <>
                  <span className="text-xl font-extrabold tabular-nums text-[#EBF0E8]">{s.valeur}</span>
                  <span className="text-[11px] font-medium leading-tight text-[#EBF0E8]/55">{s.label}</span>
                </>
              );
              const classe = `flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 transition ${
                s.accent ? "border-[#fff200]/40 bg-[#fff200]/10" : "border-white/10 bg-white/[0.04]"
              } ${s.href ? "hover:border-[#0afe6b]/40 hover:bg-[#0afe6b]/10" : ""}`;
              return s.href ? (
                <Link key={s.label} href={s.href} className={classe}>
                  {contenu}
                </Link>
              ) : (
                <div key={s.label} className={classe}>
                  {contenu}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
