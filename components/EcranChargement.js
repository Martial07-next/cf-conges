// Écran de démarrage plein écran (premier chargement et /launch de la PWA).
// Aucun hook : utilisable côté serveur comme côté client. Animations en CSS
// pur (globals.css, classes cf-loader-*), coupées si l'utilisateur préfère
// réduire les animations.
import NeigeNoel from "./NeigeNoel";
import SceneChargementNoel from "./SceneChargementNoel";
import VillageNoel from "./VillageNoel";

const MESSAGES = ["Vérification de ton accès…", "Calcul de tes soldes…", "Mise à jour du planning…"];
// Apparence Noël (classe « noel » sur <html>) : messages de saison.
const MESSAGES_NOEL = ["Le Père Noël vérifie ta liste… 🎅", "Les lutins emballent tes soldes… 🎁", "Le traîneau livre ton planning… 🛷"];

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
      <VillageNoel />
      <NeigeNoel className="cf-neige-locale" />
      <div className="cf-loader-contenu">
        <div className="cf-loader-logo cf-hors-noel">
          <span className="cf-loader-anneau" aria-hidden />
          <span className="cf-loader-pastille">
            <EclairCF className="cf-loader-eclair" />
          </span>
        </div>
        <div className="cf-noel-only" aria-hidden>
          <SceneChargementNoel />
        </div>
        <p className="cf-loader-marque">
          CF <span>Congés</span>
        </p>
        <p className="cf-noel-only cf-loader-fetes">Joyeuses fêtes ✨</p>
        <div className="cf-loader-messages cf-hors-noel" aria-hidden>
          {MESSAGES.map((m, i) => (
            <span key={m} style={{ animationDelay: `${i * 1.6}s` }}>
              {m}
            </span>
          ))}
        </div>
        <div className="cf-loader-messages cf-noel-only" aria-hidden>
          {MESSAGES_NOEL.map((m, i) => (
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
