// Animation de chargement de l'apparence Noël : un sapin qui se dessine,
// une guirlande dont les lumières circulent, des boules qui s'allument une à
// une, une étoile qui scintille, des cadeaux qui sautillent et le traîneau du
// Père Noël qui traverse le ciel. SVG + CSS uniquement (globals.css,
// classes cf-sapin-*), sans bibliothèque ni fichier externe.
const BOULES = [
  [112, 78, "#B63245"], [131, 92, "#F0C978"], [100, 104, "#6FC3FF"],
  [126, 120, "#B63245"], [92, 136, "#F0C978"], [140, 146, "#F3EEE4"],
  [110, 160, "#6FC3FF"], [80, 174, "#B63245"], [150, 178, "#F0C978"],
  [122, 188, "#F3EEE4"], [96, 196, "#6FC3FF"], [160, 198, "#B63245"],
];
const CADEAUX = [
  { x: 52, y: 214, w: 34, h: 26, c: "#B63245", r: "#F0C978" },
  { x: 154, y: 210, w: 30, h: 30, c: "#2F6A50", r: "#F3EEE4" },
  { x: 184, y: 222, w: 24, h: 18, c: "#F0C978", r: "#B63245" },
];

export default function SceneChargementNoel() {
  return (
    <div className="cf-sapin">
      <span className="cf-sapin-traineau" aria-hidden />
      <svg viewBox="0 0 240 250" className="cf-sapin-svg" aria-hidden>
        <ellipse cx="120" cy="242" rx="110" ry="9" fill="#F3F7FD" opacity=".9" />
        <rect x="111" y="206" width="18" height="28" rx="3" fill="#6B4226" />
        <g className="cf-sapin-etages">
          <path className="cf-sapin-etage e1" d="M120 40 L162 100 L140 98 L176 150 L64 150 L100 98 L78 100 Z" fill="#1F7A4D" />
          <path className="cf-sapin-etage e2" d="M120 90 L176 160 L150 158 L194 212 L46 212 L90 158 L64 160 Z" fill="#196A42" />
          <path className="cf-sapin-etage e3" d="M120 40 L150 84 L90 84 Z" fill="#259259" />
          <path d="M120 40 L136 64 L104 64 Z" fill="#F3F7FD" opacity=".85" />
          <path d="M64 150 Q120 162 176 150 L170 158 Q120 170 70 158 Z M46 212 Q120 226 194 212 L188 220 Q120 232 52 220 Z" fill="#F3F7FD" opacity=".75" />
        </g>
        <path className="cf-sapin-guirlande" d="M92 84 Q120 100 150 84 M78 122 Q122 142 162 118 M70 172 Q124 196 178 168" fill="none" stroke="#F0C978" strokeWidth="3" strokeLinecap="round" />
        {BOULES.map(([x, y, c], i) => (
          <circle key={i} className="cf-sapin-boule" cx={x} cy={y} r="5.5" fill={c} style={{ animationDelay: `${0.9 + i * 0.22}s` }} />
        ))}
        <g className="cf-sapin-etoile">
          <path d="M120 14 l6 13 14 1 -11 9 4 14 -13 -8 -13 8 4 -14 -11 -9 14 -1z" fill="#F0C978" />
        </g>
        {CADEAUX.map((g, i) => (
          <g key={i} className="cf-sapin-cadeau" style={{ animationDelay: `${i * 0.35}s` }}>
            <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="3" fill={g.c} />
            <rect x={g.x + g.w / 2 - 3} y={g.y} width="6" height={g.h} fill={g.r} />
            <rect x={g.x - 2} y={g.y - 5} width={g.w + 4} height="7" rx="2" fill={g.c} />
            <path d={`M${g.x + g.w / 2} ${g.y - 5} q-9 -10 -12 -2 q3 5 12 2 q9 -10 12 -2 q-3 5 -12 2`} fill={g.r} />
          </g>
        ))}
      </svg>
    </div>
  );
}
