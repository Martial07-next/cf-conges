import { TuileIcone } from "./Icone";

// Bandeau sombre en tête de page (même style que le tableau de bord, le
// planning équipe et le Gestionnaire TR). children : actions à droite.
export default function BandeauPage({ icone, titre, sousTitre, children }) {
  return (
    <section className="relative mb-4 overflow-hidden rounded-2xl bg-[#0E1712] text-[#EBF0E8] shadow-[0_12px_40px_-24px_rgba(10,254,107,0.45)] md:mt-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#0afe6b]/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TuileIcone name={icone} sombre />
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight sm:text-lg">{titre}</h1>
            {sousTitre && <p className="truncate text-xs text-[#EBF0E8]/55">{sousTitre}</p>}
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </section>
  );
}

// Chiffre clé avec liseré de couleur (même tuile que planning / TR).
export function TuileChiffre({ valeur, label, couleur = "#0afe6b", href }) {
  const contenu = (
    <>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: couleur }} />
      <p className="text-2xl font-bold text-brand-dark">{valeur}</p>
      <p className="truncate text-xs font-medium text-brand-dark/55">{label}</p>
    </>
  );
  const classes = "relative block overflow-hidden rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card dark:border-white/10 dark:bg-brand-night";
  return href ? (
    <a href={href} className={`${classes} transition hover:border-black/10`}>
      {contenu}
    </a>
  ) : (
    <div className={classes}>{contenu}</div>
  );
}
