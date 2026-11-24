// Encadré « solde » d'une demande en attente (pages de validation).
// info : résultat de soldesPourDemandes (lib/soldeDemande.js).
const j = (n) => `${String(n).replace(".", ",")} j`;

export default function SoldeDemande({ info, libelle }) {
  if (!info) return null;
  if (!info.applicable) {
    return (
      <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-xs text-brand-dark/55 dark:bg-white/[0.04]">
        {j(info.jours)} demandé{info.jours > 1 ? "s" : ""} · <span className="font-medium">ne décompte aucun congé</span>
        {info.feries?.length > 0 && <span> · {info.feries.join(", ")} (férié) non compté</span>}
      </div>
    );
  }
  const ok = info.suffisant;
  const okTout = info.suffisantAvecAutres;
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${
        ok ? "border-brand-green/30 bg-brand-green/[0.07]" : "border-red-500/30 bg-red-500/[0.06]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${ok ? "bg-brand-green/20 text-[#15803D] dark:text-brand-green" : "bg-red-500/15 text-red-600 dark:text-red-300"}`}>
          {ok ? "✓ Solde suffisant" : "✕ Solde insuffisant"}
        </span>
        <span className="text-brand-dark/70">
          Demandé : <b className="text-brand-dark">{j(info.jours)}</b>
          {info.samedis > 0 && (
            <span className="text-brand-dark/45">
              {" "}
              (dont {info.samedis} samedi{info.samedis > 1 ? "s" : ""})
            </span>
          )}
        </span>
        <span className="text-brand-dark/70">
          Disponible{info.futur ? " au début du congé" : ""} : <b className="text-brand-dark">{j(info.disponible)}</b>
          {info.type === "CP" && (
            <span className="text-brand-dark/45">
              {" "}
              (N {j(info.n)} · N-1 {j(info.n1)})
            </span>
          )}
        </span>
        <span className={ok ? "text-brand-dark/70" : "font-semibold text-red-600 dark:text-red-300"}>
          {ok ? <>Reste après validation : <b className="text-brand-dark">{j(info.reste)}</b></> : <>Manque {j(Math.abs(info.reste))}</>}
        </span>
      </div>
      {info.feries?.length > 0 && (
        <p className="mt-1 text-brand-dark/55">
          📅 {info.feries.join(", ")} : férié{info.feries.length > 1 ? "s" : ""} non décompté{info.feries.length > 1 ? "s" : ""}.
        </p>
      )}
      {info.joursAutres > 0 && (
        <p className={`mt-1 ${okTout ? "text-brand-dark/50" : "font-medium text-amber-700 dark:text-amber-300"}`}>
          + {j(info.joursAutres)} dans d’autres demandes {libelle ? `« ${libelle} » ` : ""}en attente{okTout ? "" : " : le solde ne couvre pas tout"}.
        </p>
      )}
    </div>
  );
}
