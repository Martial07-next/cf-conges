import Icone from "@/components/Icone";
import Link from "next/link";

// Briques visuelles de « Mon espace » (tableau de bord).

export function initiales(prenom = "", nom = "") {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export function Avatar({ prenom, nom, couleur = "#0afe6b" }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#0E1712]"
      style={{ backgroundColor: `${couleur}` }}
      aria-hidden
    >
      {initiales(prenom, nom)}
    </span>
  );
}

// Carte de solde : titre coloré, chiffre principal, barre de consommation.
export function SoldeCard({ titre, couleur, valeur, unite = "j", total = null, utilise = null, legende, href, lien, info, children }) {
  const pourcent = total ? Math.min(100, Math.max(0, (utilise / total) * 100)) : null;
  return (
    <div className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-brand-night">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: couleur }} />
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand-dark/55">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: couleur }} />
          <span className="truncate">{titre}</span>
        </p>
        {info && (
          <span title={info} className="flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full bg-black/5 text-[10px] font-bold text-brand-dark/50 dark:bg-white/10">
            i
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold tabular-nums leading-none text-brand-dark">
        {valeur}
        <span className="ml-1 text-sm font-semibold text-brand-dark/40">
          {unite}
          {total !== null && ` / ${total}`}
        </span>
      </p>
      {pourcent !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10" title={`${utilise} ${unite} utilisés sur ${total}`}>
          <div className="h-full rounded-full" style={{ width: `${pourcent}%`, backgroundColor: couleur }} />
        </div>
      )}
      {legende && <p className="mt-2 text-xs text-brand-dark/50">{legende}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        {href && (
          <Link href={href} className="text-xs font-semibold text-brand-greendark hover:underline">
            {lien || "Voir le détail"} →
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}

// Carte de liste avec en-tête (titre, compteur) et pied (lien d'action).
export function WidgetCard({ titre, icone, compteur, tonCompteur = "vert", action, className = "", children }) {
  const tons = {
    vert: "bg-brand-green/15 text-brand-greendark",
    jaune: "bg-brand-yellow/40 text-brand-dark",
  };
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card dark:border-white/10 dark:bg-brand-night ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-black/5 px-5 py-4 dark:border-white/10">
        <h2 className="flex items-center gap-2 font-bold text-brand-dark">
          {icone && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-green/15 text-brand-greendark dark:text-brand-green">
              <Icone name={icone} className="h-4 w-4" />
            </span>
          )}
          {titre}
        </h2>
        {compteur ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tons[tonCompteur]}`}>{compteur}</span> : null}
      </div>
      <div className="flex-1">{children}</div>
      {action && (
        <div className="border-t border-black/5 px-5 py-3 dark:border-white/10">
          <Link href={action.href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-greendark hover:underline">
            {action.label} →
          </Link>
        </div>
      )}
    </div>
  );
}

// État vide avec une action éventuelle.
export function Vide({ titre, sousTitre, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-brand-dark">{titre}</p>
      {sousTitre && <p className="text-xs text-brand-dark/50">{sousTitre}</p>}
      {action && (
        <Link href={action.href} className="mt-3 inline-flex rounded-xl bg-brand-green px-3.5 py-2 text-xs font-bold text-[#16231A] hover:bg-brand-greendark hover:text-white">
          {action.label}
        </Link>
      )}
    </div>
  );
}
