export default function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
  src={dark ? "/logo-light" : "/logo-light"}
  alt="CF Réseaux"
  className="h-8 w-auto shrink-0"
/>
      <div className="leading-tight">
        <div className={`font-bold text-[15px] tracking-tight ${dark ? "text-brand-dark" : "text-brand-cream"}`}>
          CF Réseaux
        </div>
        <div className={`text-[10.5px] uppercase tracking-[0.14em] ${dark ? "text-brand-dark/60" : "text-brand-cream/60"}`}>
          Congés
        </div>
      </div>
    </div>
  );
}
