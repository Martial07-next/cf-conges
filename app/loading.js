export default function AppLoading() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-yellow/70 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <span className="text-3xl animate-bounce" aria-hidden="true">⚡</span>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-greendark dark:text-brand-green mb-2">
          CF Congés
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark dark:text-white">
          On prépare ton espace...
        </h1>
        <p className="mt-2 text-sm text-brand-dark/55 dark:text-white/55">
          Soldes, planning et équipe arrivent juste après ☕
        </p>

        <div
          className="mt-7 h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10"
          role="progressbar"
          aria-label="Chargement de votre espace"
        >
          <div className="cf-loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-brand-yellow via-brand-green to-brand-greendark" />
        </div>

        <p className="mt-3 text-[11px] font-medium text-brand-dark/35 dark:text-white/35">
          Pas besoin de cliquer, on s'occupe de tout 😎
        </p>

        <style>{`
          @keyframes cf-loading-slide {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(420%); }
          }
          .cf-loading-bar {
            animation: cf-loading-slide 1.15s ease-in-out infinite;
            will-change: transform;
          }
          @media (prefers-reduced-motion: reduce) {
            .cf-loading-bar {
              animation-duration: 2.5s;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
