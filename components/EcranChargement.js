// Écran de démarrage plein écran (premier chargement et /launch de la PWA).
// Aucun hook : utilisable côté serveur comme côté client. Animations en CSS
// pur (globals.css, classes cf-loader-*), coupées si l'utilisateur préfère
// réduire les animations.
const MESSAGES = ["Vérification de ton accès…", "Calcul de tes soldes…", "Mise à jour du planning…"];

export function EclairCF({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="cfEclair" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0AFE6B" />
          <stop offset="1" stopColor="#E3F516" />
        </linearGradient>
      </defs>
      <path d="M38 4 14 36h15l-5 24 26-34H35l3-22Z" fill="url(#cfEclair)" />
    </svg>
  );
}

export default function EcranChargement({ style, className = "" }) {
  return (
    <div
      role="status"
      aria-label="Chargement de CF Congés"
      aria-live="polite"
      className={`cf-loader ${className}`}
      style={style}
    >
      <div className="cf-loader-halo" aria-hidden />
      <div className="cf-loader-contenu">
        <div className="cf-loader-logo">
          <span className="cf-loader-anneau" aria-hidden />
          <span className="cf-loader-pastille">
            <EclairCF className="cf-loader-eclair" />
          </span>
        </div>
        <p className="cf-loader-marque">
          CF <span>Congés</span>
        </p>
        <div className="cf-loader-messages" aria-hidden>
          {MESSAGES.map((m, i) => (
            <span key={m} style={{ animationDelay: `${i * 1.6}s` }}>
              {m}
            </span>
          ))}
        </div>
        <span className="sr-only">On prépare ton espace</span>
        <div className="cf-loader-barre" aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
}
