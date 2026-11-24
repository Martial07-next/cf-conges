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
        {/* Bonnet posé à plat sur le haut de l'éclair : dans le logo (32 px de
            haut), le bord supérieur de l'éclair est plat, de 11,2 à 19,8 px, à
            7,1 px du haut. Le bord blanc du bonnet (bas à 15,4 px dans le
            bonnet) couvre exactement ce bord (11 → 20,3 px) et mord d’1 px : aucun écart. */}
        <BonnetNoel className="absolute" style={{ left: "10.45px", top: "-4.85px", width: "17.5px", height: "14.2px" }} />
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
