import { apparenceEtat, memeEtat, HORAIRES } from "@/lib/etatJournee";

// Composants serveur : le clic est géré par HoteDetailJournee (DetailJournee.js).
// matin / aprem : états construits par lib/etatJournee.js

// Texte d'une case : libellé en vue Semaine, code en vue Mois (B pour une
// présence au bureau, initiale seulement dans une demi-case).
function texteCase(etat, entiere, variante) {
  if (variante === "mois") {
    return entiere ? etat.code : etat.code.charAt(0);
  }
  return entiere && etat.type !== "bureau" ? etat.label : etat.code;
}

// Case du planning (vues Semaine et Mois). Journée identique = un seul bloc.
// refJournee : numéros de la personne, de la date et des états dans le registre
// transmis à HoteDetailJournee.
export function CaseJournee({ refJournee, matin, aprem, variante = "semaine" }) {
  const entiere = memeEtat(matin, aprem);
  const hauteur = variante === "mois" ? "h-5" : "h-7";
  const texte = variante === "mois" ? "text-[9px]" : "text-[10px]";
  const moities = entiere ? [{ cle: "J", etat: matin }] : [{ cle: "M", etat: matin }, { cle: "A", etat: aprem }];
  const titre = entiere ? matin.label : `Matin : ${matin.label} · Après-midi : ${aprem.label}`;

  return (
    <button
      type="button"
      data-journee={refJournee}
      title={titre}
      className={`case-jour ${hauteur}`}
    >
      {moities.map(({ cle, etat }) => {
        const { className, style } = apparenceEtat(etat);
        return (
          <span key={cle} className={`case-moitie ${texte} ${className}`} style={style}>
            <span>{texteCase(etat, entiere, variante)}</span>
          </span>
        );
      })}
    </button>
  );
}

// Ligne de la vue Jour : frise 8h-12h / 13h-16h, détail au clic.
export function FriseJournee({ refJournee, nom, matin, aprem }) {
  const entiere = memeEtat(matin, aprem);
  const segments = entiere
    ? [{ cle: "JOURNEE", label: "Journée", etat: matin, poids: "flex-[7]" }]
    : [
        { cle: "MATIN", label: "Matin", etat: matin, poids: "flex-[4]" },
        { cle: "APREM", label: "Après-midi", etat: aprem, poids: "flex-[3]" },
      ];

  return (
    <button
      type="button"
      data-journee={refJournee}
      aria-label={`Détail de la journée de ${nom}`}
      className="group flex w-full gap-1 rounded-xl text-left focus-ring"
    >
      {segments.map((s) => {
        const { className, style } = apparenceEtat(s.etat);
        return (
          <span
            key={s.cle}
            className={`${s.poids} min-w-0 rounded-xl px-3 py-2 transition group-hover:brightness-95 ${className}`}
            style={style}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-75">
              {s.label} · {HORAIRES[s.cle]}
            </span>
            <span className="block truncate text-sm font-bold">
              {s.etat.label}
              {s.etat.lieu ? ` · ${s.etat.lieu}` : ""}
            </span>
          </span>
        );
      })}
    </button>
  );
}

