// Neige qui tombe en fond de page, uniquement avec l'apparence Noël (classe
// « noel » sur <html>, voir globals.css). Positions calculées à partir de
// l'index : identiques côté serveur et navigateur.
const FLOCONS = Array.from({ length: 34 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  taille: 6 + ((i * 7) % 9),
  duree: 9 + ((i * 13) % 11),
  delai: -((i * 17) % 19),
  derive: ((i % 5) - 2) * 14,
  opacite: 0.35 + ((i * 3) % 5) / 10,
}));

export default function NeigeNoel({ className = "" }) {
  return (
    <div aria-hidden className={`cf-neige ${className}`}>
      {FLOCONS.map((f, i) => (
        <span
          key={i}
          style={{
            left: `${f.left}%`,
            fontSize: `${f.taille}px`,
            opacity: f.opacite,
            animationDuration: `${f.duree}s`,
            animationDelay: `${f.delai}s`,
            "--derive": `${f.derive}px`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}
