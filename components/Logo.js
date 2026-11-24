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
        {/* Bonnet posé sur le haut de l'éclair : dans le logo (32 px de haut),
            le bord supérieur de l'éclair va de 11 à 20 px, à 7 px du haut. */}
        <BonnetNoel className="absolute" style={{ left: "8.5px", top: "-9.5px", width: "21px", height: "17px", transform: "rotate(-6deg)", filter: "drop-shadow(0 1.5px 1px rgba(0, 0, 0, 0.45))" }} />
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
