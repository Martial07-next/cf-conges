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

// Journée de travail : 8h-12h puis 13h-16h (même découpage qu'« Équipe en direct »).
function journee(p, jourSemaine) {
  const minutes = p.h * 60 + p.m + p.s / 60;
  const debut = 8 * 60, pauseDebut = 12 * 60, pauseFin = 13 * 60, fin = 16 * 60;
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
  if (weekend) return { pourcent: 0, texte: "C'est le week-end 😎" };
  if (minutes < debut) return { pourcent: 0, texte: `Début dans ${restant(debut)}` };
  if (minutes < pauseDebut) return { pourcent, texte: `Pause dans ${restant(pauseDebut)}` };
  if (minutes < pauseFin) return { pourcent, texte: `Pause · reprise dans ${restant(pauseFin)}` };
  if (minutes < fin) return { pourcent, texte: `Fin dans ${restant(fin)}` };
  return { pourcent: 100, texte: "Journée terminée ✨" };
}

function numeroSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jour);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
}

// Bandeau d'accueil compact du tableau de bord (DA CF Réseaux) : logo,
// salutation selon l'heure, date, progression de la journée, horloge en
// direct, chiffres clés et actions rapides.
export default function DashboardHero({ prenom, sousTitre, stats = [], actions = [], extra = null }) {
  const [maintenant, setMaintenant] = useState(null);

  useEffect(() => {
    setMaintenant(new Date());
    const id = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const p = maintenant ? partiesParis(maintenant) : null;
  const j = p ? journee(p, p.weekday) : { pourcent: 0, texte: "" };
  const date = p ? `${p.weekday.charAt(0).toUpperCase() + p.weekday.slice(1)} ${p.day} ${p.month}` : "\u00a0";

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-[#0E1712] text-[#EBF0E8] shadow-[0_12px_40px_-24px_rgba(10,254,107,0.45)] md:mt-8">
      {/* Décor discret : halo vert et éclair du logo en filigrane */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#0afe6b]/15 blur-3xl" />
        <img src="/logo-light.png" alt="" className="absolute -bottom-6 right-24 h-36 w-auto opacity-[0.04]" />
      </div>

      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
        {/* Logo + salutation */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img src="/app-logo.png" alt="CF Réseaux" className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-white/10" />
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight sm:truncate sm:text-lg">
              {p ? salutation(p.h) : "Bonjour"} {prenom} 👋
            </h1>
            <p className="truncate text-xs text-[#EBF0E8]/55" title={sousTitre}>
              {date}
              {maintenant && <span className="text-[#EBF0E8]/35"> · Semaine {numeroSemaine(maintenant)}</span>}
            </p>
          </div>
        </div>

        {/* Progression de la journée */}
        <div className="order-3 w-full sm:order-none sm:w-44" title="Journée : 8h-12h et 13h-16h">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#EBF0E8]/75">{j.texte}</span>
            <span className="tabular-nums text-[#EBF0E8]/35">{Math.round(j.pourcent)} %</span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#0afe6b] to-[#fff200] transition-[width] duration-1000" style={{ width: `${j.pourcent}%` }} />
            {/* Pause déjeuner : après 4 h sur 7 */}
            <div className="absolute inset-y-0 w-0.5 bg-[#0E1712]" style={{ left: `${(4 / 7) * 100}%` }} />
          </div>
        </div>

        {/* Horloge en direct */}
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 font-mono text-xl font-bold tabular-nums leading-none sm:text-2xl" suppressHydrationWarning>
          {p ? (
            <>
              {p.hour}
              <span className="animate-pulse text-[#0afe6b]">:</span>
              {p.minute}
              <span className="ml-0.5 text-xs text-[#EBF0E8]/40">{p.second}</span>
            </>
          ) : (
            "--:--"
          )}
        </div>
      </div>

      {/* Chiffres clés + actions */}
      {(stats.length > 0 || actions.length > 0 || extra) && (
        <div className="relative flex flex-wrap items-center gap-2 border-t border-white/[0.07] px-4 py-2.5 sm:px-5">
          {stats.map((s) => {
            const contenu = (
              <>
                <span className="font-bold tabular-nums text-[#EBF0E8]">{s.valeur}</span>
                <span className="text-[#EBF0E8]/55">{s.label}</span>
              </>
            );
            const classe = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
              s.accent ? "border-[#fff200]/50 bg-[#fff200]/10" : "border-white/10 bg-white/[0.04]"
            } ${s.href ? "hover:border-[#0afe6b]/50 hover:bg-[#0afe6b]/10" : ""}`;
            return s.href ? (
              <Link key={s.label} href={s.href} className={classe}>
                {contenu}
              </Link>
            ) : (
              <span key={s.label} className={classe}>
                {contenu}
              </span>
            );
          })}
          {(actions.length > 0 || extra) && (
            <div className="ml-auto flex flex-wrap gap-2">
              {extra}
              {actions.map((a, i) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={
                    i === 0
                      ? "inline-flex items-center rounded-lg bg-[#0afe6b] px-3 py-1.5 text-xs font-bold text-[#0E1712] transition hover:bg-[#3dff8c]"
                      : "inline-flex items-center rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-[#EBF0E8] transition hover:bg-white/10"
                  }
                >
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
