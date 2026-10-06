import LaunchClient from "@/components/LaunchClient";

export const dynamic = "force-static";

export default function LaunchPage() {
  return (
    <main
      aria-label="Chargement de CF Congés"
      aria-live="polite"
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-[#F5F1E8] p-6 text-[#16231A] dark:bg-[#0E1712] dark:text-[#EBF0E8]"
    >
      <LaunchClient />
      <div className="w-full max-w-[420px] text-center">
        <div className="cf-launch-emoji mb-[18px] text-[44px] leading-none">⚡</div>
        <div className="mb-2 text-xs font-extrabold tracking-[0.2em]">CF CONGÉS</div>
        <div className="text-[25px] font-extrabold">On prépare ton espace...</div>
        <div className="mt-2 text-sm opacity-[0.58]">
          Vérification de ton accès et chargement de tes données
        </div>
        <div className="mt-[26px] h-[9px] overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="cf-launch-progress h-full w-[35%] rounded-full bg-[#6CB64D]" />
        </div>
        <div className="mt-3 text-[11px] opacity-[0.38]">
          Aucun bouton à toucher, on s&apos;occupe de tout 😎
        </div>
      </div>
    </main>
  );
}
