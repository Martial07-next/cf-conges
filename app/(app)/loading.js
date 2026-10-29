// Affiché tout de suite au clic sur une page, pendant que le serveur la
// calcule. Permet aussi aux liens de ne précharger que la structure de la
// page (et pas ses données).
export default function Chargement() {
  return (
    <div aria-busy="true" aria-label="Chargement…" className="animate-pulse">
      <div className="mb-4 h-[68px] rounded-2xl bg-[#0E1712] md:mt-8" />
      <div className="mb-5 h-14 rounded-2xl border border-black/5 bg-white shadow-card dark:border-white/10 dark:bg-brand-night" />
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[74px] rounded-2xl border border-black/5 bg-white shadow-card dark:border-white/10 dark:bg-brand-night" />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-black/5 bg-white shadow-card dark:border-white/10 dark:bg-brand-night" />
    </div>
  );
}
