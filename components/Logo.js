export default function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="34" height="34" rx="9" fill={dark ? "#FFF200" : "#16231A"} />
        <path
          d="M10 11.5C10 10.6716 10.6716 10 11.5 10H22.5C23.3284 10 24 10.6716 24 11.5C24 12.3284 23.3284 13 22.5 13H13.5V15.8H21C21.8284 15.8 22.5 16.4716 22.5 17.3C22.5 18.1284 21.8284 18.8 21 18.8H13.5V22.5C13.5 23.3284 12.8284 24 12 24C11.1716 24 10.5 23.3284 10.5 22.5V11.7C10.5 11.6 10.5 11.55 10 11.5Z"
          fill={dark ? "#16231A" : "#FFFDF4"}
        />
      </svg>
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
