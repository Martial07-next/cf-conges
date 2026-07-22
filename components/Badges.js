const STATUS_STYLES = {
  EN_ATTENTE: "bg-brand-yellow/25 text-brand-dark border-brand-yellow/60",
  VALIDE: "bg-brand-green/15 text-brand-greendark border-brand-green/50",
  REFUSE: "bg-alert-soft/15 text-alert-soft border-alert-soft/40",
  ANNULE: "bg-black/5 text-brand-dark/50 border-black/10",
};

const STATUS_LABELS = {
  EN_ATTENTE: "En attente",
  VALIDE: "Validé",
  REFUSE: "Refusé",
  ANNULE: "Annulé",
};

export function StatusBadge({ statut }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        STATUS_STYLES[statut] || STATUS_STYLES.ANNULE
      }`}
    >
      {STATUS_LABELS[statut] || statut}
    </span>
  );
}

export function TypeBadge({ leaveType }) {
  if (!leaveType) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-black/5"
      style={{ backgroundColor: `${leaveType.couleur}22`, color: "#16231A" }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: leaveType.couleur }} />
      {leaveType.libelle}
    </span>
  );
}

export function Pill({ children, tone = "default" }) {
  const tones = {
    default: "bg-black/5 text-brand-dark",
    yellow: "bg-brand-yellow/30 text-brand-dark",
    green: "bg-brand-green/20 text-brand-greendark",
    red: "bg-alert-soft/15 text-alert-soft",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}
