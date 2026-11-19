// Affiché tout de suite au clic sur une page, pendant que le serveur la
// calcule. Permet aussi aux liens de ne précharger que la structure de la
// page (et pas ses données). Fine barre de progression en haut de l'écran,
// bandeau sombre aux couleurs de la plateforme et squelette avec reflet.
import { EclairCF } from "@/components/EcranChargement";

const carte = "rounded-2xl border border-black/5 bg-white shadow-card dark:border-white/10 dark:bg-brand-night";

function Ligne({ className, style }) {
  return <span className={`cf-squelette block rounded-full ${className}`} style={style} />;
}

export default function Chargement() {
  return (
    <div aria-busy="true" role="status" aria-label="Chargement de la page">
      <div className="cf-page-barre" aria-hidden>
        <span />
      </div>

      <section className="relative mb-4 overflow-hidden rounded-2xl bg-[#0E1712] text-[#EBF0E8] md:mt-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#0afe6b]/15 blur-3xl" />
        <div className="relative flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
            <EclairCF className="cf-loader-eclair h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight sm:text-lg">Chargement…</p>
            <p className="text-xs text-[#EBF0E8]/55">Encore un instant, on récupère les dernières données</p>
          </div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${carte} space-y-2.5 px-4 py-3.5`}>
            <Ligne className="h-6 w-12" />
            <Ligne className="h-2.5 w-24" />
          </div>
        ))}
      </div>

      <div className={`${carte} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10">
          <Ligne className="h-3.5 w-40" />
          <Ligne className="h-7 w-24" />
        </div>
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {[72, 58, 84, 64, 48].map((largeur, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3.5">
              <span className="cf-squelette h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Ligne className="h-3" style={{ width: `${largeur}%` }} />
                <Ligne className="h-2.5 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
