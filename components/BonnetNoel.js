// Petit bonnet de Père Noël posé sur un logo (visible seulement avec
// l'apparence Noël, classe cf-noel-only).
export default function BonnetNoel({ className = "", style }) {
  return (
    <svg viewBox="0 0 64 52" aria-hidden className={`cf-noel-only pointer-events-none ${className}`} style={style}>
      <path d="M8 40C10 20 24 6 42 8c8 1 13 7 15 14l-6 3c-2-5-5-8-10-8-9 0-15 9-17 23Z" fill="#D7263D" />
      <path d="M8 40C10 20 24 6 42 8c-6 2-14 12-16 32Z" fill="#B3172C" opacity=".55" />
      <rect x="2" y="36" width="34" height="11" rx="5.5" fill="#FFFFFF" />
      <circle cx="56" cy="25" r="6" fill="#FFFFFF" />
    </svg>
  );
}
