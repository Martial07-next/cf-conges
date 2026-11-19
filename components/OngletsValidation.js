import Link from "next/link";

// Onglets "Demandes" / "Suivi des congés" des pages de validation.
// marge : espace sous les onglets (désactivé quand ils sont dans une barre d'outils).
export default function OngletsValidation({ chemin, actif, labelDemandes = "Demandes & accès", marge = true }) {
  const style = (estActif) =>
    `inline-block px-3.5 py-1.5 rounded-lg text-sm font-semibold ${estActif ? "bg-white text-brand-dark shadow-sm dark:bg-white/15" : "text-brand-dark/50 hover:text-brand-dark"}`;
  return (
    <div className={`inline-flex gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/10 ${marge ? "mb-6" : ""}`}>
      <Link href={chemin} className={style(actif !== "suivi")}>
        {labelDemandes}
      </Link>
      <Link href={`${chemin}?onglet=suivi`} className={style(actif === "suivi")}>
        Suivi des congés
      </Link>
    </div>
  );
}
