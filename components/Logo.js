import Image from "next/image";
import BonnetNoel from "./BonnetNoel";

export default function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="relative shrink-0">
        <Image
          src={dark ? "/logo.png" : "/logo-light.png"}
          alt="CF Réseaux"
          width={180}
          height={64}
          priority
          className="h-8 w-auto shrink-0 object-contain"
        />
        <BonnetNoel className="absolute -left-2 -top-3.5 h-5 w-6 -rotate-12" />
      </span>

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
