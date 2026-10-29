"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { seDeconnecter } from "@/lib/pushAppareil";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";
import Icone from "./Icone";

const ROLE_LABEL = {
  COLLABORATEUR: "Collaborateur",
  COMPTABLE: "Comptable",
  EMPLOYEUR: "Employeur / RH",
  CADRE: "Cadre",
  ADMIN: "Administrateur",
};

const JOURS_LABEL = { LUNDI: "Lundi", MARDI: "Mardi", MERCREDI: "Mercredi", JEUDI: "Jeudi", VENDREDI: "Vendredi" };

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// notifications / apparence : blocs serveur (push, thème) insérés dans les
// cartes correspondantes.
export default function ProfileForm({ user, notifications = null, apparence = null }) {
  const router = useRouter();
  const { update } = useSession();
  const [voirMotsDePasse, setVoirMotsDePasse] = useState(false);
  // Onglet affiché (une seule rubrique à la fois).
  const onglets = [
    { id: "informations", label: "Informations", icone: "profil" },
    { id: "securite", label: "Sécurité", icone: "securite" },
    ...(user.teletravailAutorise ? [{ id: "teletravail", label: "Télétravail", icone: "teletravail" }] : []),
    ...(notifications ? [{ id: "notifications", label: "Notifications", icone: "notifications" }] : []),
    ...(apparence ? [{ id: "apparence", label: "Apparence", icone: "apparence" }] : []),
  ];
  const [onglet, setOnglet] = useState(user.doitChangerMotDePasse ? "securite" : "informations");
  const [dateNaissance, setDateNaissance] = useState(dateKey(user.dateNaissance));
  const [naissanceMessage, setNaissanceMessage] = useState("");

  async function enregistrerNaissance(e) {
    e.preventDefault();
    setNaissanceMessage("");
    const res = await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateNaissance }),
    });
    const data = await res.json().catch(() => ({}));
    setNaissanceMessage(res.ok ? "Enregistré ✓" : data.error || "Erreur.");
    if (res.ok) router.refresh();
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [teletravailJours, setTeletravailJours] = useState(
    user.teletravailJoursFixes?.filter((jourFixe) => !jourFixe.dateFin).map((jourFixe) => jourFixe.jour) ||
      user.teletravailJours || []
  );
  const [overrides, setOverrides] = useState(user.teletravailOverrides || []);
  const [ttEdition, setTtEdition] = useState(null);
  const [nouveauJourTT, setNouveauJourTT] = useState("");
  const [ttMessage, setTtMessage] = useState("");

  useEffect(() => {
    setOverrides(user.teletravailOverrides || []);
    setTeletravailJours(
      user.teletravailJoursFixes?.filter((jourFixe) => !jourFixe.dateFin).map((jourFixe) => jourFixe.jour) ||
        user.teletravailJours || []
    );
  }, [user.teletravailOverrides, user.teletravailJoursFixes, user.teletravailJours]);

  async function toggleJourTT(jour) {
    const precedent = teletravailJours;
    let next;
    if (precedent.includes(jour)) {
      next = precedent.filter((j) => j !== jour);
    } else {
      if (precedent.length >= user.teletravailJoursMax) {
        setTtMessage(`Vous ne pouvez choisir que ${user.teletravailJoursMax} jour(s) fixe(s) par semaine.`);
        return;
      }
      next = [...precedent, jour];
    }

    setTtMessage("");
    setTeletravailJours(next);

    try {
      const res = await fetch("/api/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teletravailJours: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTeletravailJours(precedent);
        setTtMessage(data.error || "Impossible d'enregistrer ce jour.");
        return;
      }
      setTtMessage("Jour fixe enregistré ✓");
      router.refresh();
    } catch {
      setTeletravailJours(precedent);
      setTtMessage("Impossible d'enregistrer ce jour.");
    }
  }

  async function echangerOccurrenceTT(dateRetrait, dateAjout) {
    setTtMessage("");
    const res = await fetch("/api/profil/teletravail-echange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateRetrait, dateAjout }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTtMessage(data.error || "Erreur.");
      return;
    }
    setOverrides((actuels) => {
      const sansDates = actuels.filter((o) => {
        const date = dateKey(o.date);
        return date !== dateRetrait && date !== dateAjout;
      });
      return [
        ...sansDates,
        { date: dateRetrait, type: "RETRAIT" },
        { date: dateAjout, type: "AJOUT" },
      ];
    });
    setTtMessage("Télétravail déplacé ✓");
    setTtEdition(null);
    setNouveauJourTT("");
    router.refresh();
  }

  async function retirerOccurrenceTT(date) {
    if (!confirm("Ne pas prendre ce jour de télétravail ?")) return;
    setTtMessage("");
    const res = await fetch("/api/profil/teletravail-exception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ du: date, au: date }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTtMessage(data.error || "Erreur.");
      return;
    }
    setOverrides((actuels) => {
      const sansDate = actuels.filter((o) => dateKey(o.date) !== date);
      return [...sansDate, { date, type: "RETRAIT" }];
    });
    setTtMessage("Télétravail retiré pour cette journée ✓");
    router.refresh();
  }

  function isoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function prochainsTeletravails() {
    const ordre = { LUNDI: 1, MARDI: 2, MERCREDI: 3, JEUDI: 4, VENDREDI: 5 };
    const joursFixesActifs = new Set(teletravailJours);
    const exceptions = new Map(overrides.map((o) => [dateKey(o.date), o.type]));
    const debut = new Date();
    debut.setHours(12, 0, 0, 0);
    const resultat = [];

    for (let i = 0; i < 42 && resultat.length < 8; i++) {
      const d = new Date(debut);
      d.setDate(debut.getDate() + i);
      const jourNum = d.getDay();
      if (jourNum === 0 || jourNum === 6) continue;
      const iso = isoLocal(d);
      const typeException = exceptions.get(iso);
      if (typeException === "AJOUT") {
        resultat.push({ date: iso, source: "AJOUT" });
        continue;
      }
      if (typeException === "RETRAIT") continue;

      const nomJour = Object.keys(ordre).find((key) => ordre[key] === jourNum);
      const actif = joursFixesActifs.has(nomJour);
      if (actif) resultat.push({ date: iso, source: "FIXE" });
    }
    return resultat;
  }

  function joursAlternatifs(dateISO) {
    const base = new Date(`${dateISO}T12:00:00`);
    const day = base.getDay();
    const lundi = new Date(base);
    lundi.setDate(base.getDate() - (day - 1));
    const existants = new Set(prochainsTeletravails().map((x) => x.date));
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(lundi.getDate() + i);
      return { date: isoLocal(d), label: JOURS_LABEL[Object.keys(JOURS_LABEL)[i]] };
    }).filter((x) => x.date !== dateISO && !existants.has(x.date));
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur.");
        return;
      }

      setSuccess("Mot de passe mis à jour.");
      setCurrentPassword("");
      setNewPassword("");

      if (user.doitChangerMotDePasse) {
        // Mot de passe changé suite à une réinitialisation admin : on déconnecte
        // automatiquement, le collaborateur doit se reconnecter avec son
        // nouveau mot de passe.
        await seDeconnecter(signOut);
        return;
      }

      // Changement volontaire (hors réinitialisation) : on reste connecté, on
      // rafraîchit juste le cookie de session par sécurité.
      await update();
    } catch {
      setError("Une erreur inattendue est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <nav className="mb-5 flex flex-wrap gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/10" role="tablist" aria-label="Rubriques du profil">
        {onglets.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition sm:flex-none ${
              onglet === o.id ? "bg-white text-brand-dark shadow-sm dark:bg-brand-night dark:text-brand-cream" : "text-brand-dark/55 hover:text-brand-dark dark:text-brand-cream/55"
            }`}
          >
            <Icone name={o.icone} className="h-4 w-4" />
            {o.label}
          </button>
        ))}
      </nav>
    <div className="max-w-3xl">
      {user.doitChangerMotDePasse && (
        <div className="mb-5 bg-brand-yellow/15 border border-brand-yellow/40 text-brand-dark text-sm rounded-xl px-4 py-3">
          Votre mot de passe a été réinitialisé par l'administrateur. Vous devez le changer ci-dessous avant de pouvoir accéder au reste de la plateforme.
        </div>
      )}

      {onglet === "informations" && (
      <Card className="p-6" id="informations">
        <TitreSection icone="profil" titre="Mes informations" sousTitre="Gérées par l'administration, sauf votre date de naissance." />
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <Info label="Nom complet" valeur={`${user.prenom} ${user.nom}`} />
          <Info label="Email" valeur={user.email} />
          <Info label="Rôle" valeur={ROLE_LABEL[user.role]} />
          <Info label="Pôle" valeur={user.pole || "Non renseigné"} />
          <Info label="Service" valeur={user.service || "Non renseigné"} />
          <Info
            label="Date d'entrée"
            valeur={user.dateEntree ? new Date(user.dateEntree).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "Non renseignée"}
          />
          {user.tuteur && <Info label="Tuteur" valeur={`${user.tuteur.prenom} ${user.tuteur.nom}`} />}
        </dl>
        <form onSubmit={enregistrerNaissance} className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-dark/50">🎂 Date de naissance</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateNaissance}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="rounded-xl border border-black/10 bg-brand-cream/60 px-3 py-2 text-sm focus-ring outline-none"
            />
            <Button type="submit" variant="secondary" className="!px-3.5 !py-2 !text-xs" disabled={!dateNaissance || dateNaissance === dateKey(user.dateNaissance)}>
              Enregistrer
            </Button>
            {naissanceMessage && <span className="text-xs font-semibold text-brand-greendark">{naissanceMessage}</span>}
          </div>
          <p className="mt-1.5 text-[11px] text-brand-dark/45">Sert à vous souhaiter votre anniversaire 🎉</p>
        </form>
      </Card>

      )}

      {onglet === "securite" && (
      <Card className="p-6" id="securite">
        <TitreSection icone="securite" titre="Sécurité" sousTitre="Changez votre mot de passe quand vous le souhaitez." />
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Mot de passe actuel</label>
            <input type={voirMotsDePasse ? "text" : "password"} required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Nouveau mot de passe</label>
            <input type={voirMotsDePasse ? "text" : "password"} required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none" />
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${newPassword.length >= 12 ? "bg-brand-green" : newPassword.length >= 8 ? "bg-brand-yellow" : "bg-alert-soft"}`}
                style={{ width: `${Math.min(100, (newPassword.length / 12) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-brand-dark/45">8 caractères minimum, 12 ou plus recommandés.</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-brand-dark/60">
            <input type="checkbox" checked={voirMotsDePasse} onChange={(e) => setVoirMotsDePasse(e.target.checked)} className="accent-brand-green" />
            Afficher les mots de passe
          </label>

          {error && <p className="text-sm text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-xl px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-brand-greendark bg-brand-green/10 border border-brand-green/30 rounded-xl px-3 py-2">{success}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : "Mettre à jour"}
          </Button>
        </form>
      </Card>

      )}

      {onglet === "teletravail" && user.teletravailAutorise && (
        <Card className="p-6" id="teletravail">
          <TitreSection icone="teletravail" titre="Mes jours de télétravail" sousTitre={`Choisissez jusqu'à ${user.teletravailJoursMax} jour(s) fixe(s) par semaine. Tout ajout prend effet à partir d'aujourd'hui et ne modifie jamais les semaines déjà passées.`} />
          <div className="flex flex-wrap gap-2">
            {["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI"].map((jour) => (
              <button
                key={jour}
                type="button"
                onClick={() => toggleJourTT(jour)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  teletravailJours.includes(jour) ? "border-brand-green bg-brand-green/15 text-brand-dark" : "border-black/10 text-brand-dark/70 hover:border-black/20"
                }`}
              >
                {jour.charAt(0) + jour.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-black/5">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
              <div>
                <p className="text-sm font-bold text-brand-dark">Mes prochains télétravails</p>
                <p className="text-xs text-brand-dark/50 mt-1">Déplacez un jour prévu ou retirez-le si vous ne le prenez pas.</p>
              </div>
              <span className="text-[11px] font-semibold rounded-full bg-brand-green/10 px-2.5 py-1 text-brand-dark/60">6 prochaines semaines</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {prochainsTeletravails().length === 0 ? (
                <p className="text-sm text-brand-dark/45 sm:col-span-2">Aucun télétravail prévu prochainement.</p>
              ) : prochainsTeletravails().map((tt) => {
                const alternatives = joursAlternatifs(tt.date);
                const ouvert = ttEdition === tt.date;
                return (
                  <div key={tt.date} className="min-w-0 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-brand-dark">{new Date(`${tt.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
                        <p className="text-xs text-brand-dark/45 mt-1">{tt.source === "AJOUT" ? "Télétravail déplacé" : "Télétravail planifié"}</p>
                      </div>
                      <span className="w-2.5 h-2.5 mt-1.5 shrink-0 rounded-full bg-[rgb(10_254_107)]" />
                    </div>
                    {ouvert ? (
                      <div className="mt-4 pt-3 border-t border-black/5">
                        <p className="text-xs font-semibold text-brand-dark/60 mb-2">Choisir un autre jour cette semaine</p>
                        <div className="flex flex-wrap gap-2">
                          {alternatives.map((alt) => (
                            <button key={alt.date} type="button" onClick={() => setNouveauJourTT(alt.date)} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${nouveauJourTT === alt.date ? "border-[rgb(10_254_107)] bg-[rgb(10_254_107)]/15 text-brand-dark" : "border-black/10 text-brand-dark/60 hover:bg-black/5"}`}>
                              {alt.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button type="button" disabled={!nouveauJourTT} onClick={() => echangerOccurrenceTT(tt.date, nouveauJourTT)} className="rounded-xl bg-[rgb(10_254_107)] px-3.5 py-2 text-xs font-bold text-[#16231a] disabled:opacity-40">Confirmer le changement</button>
                          <button type="button" onClick={() => { setTtEdition(null); setNouveauJourTT(""); }} className="rounded-xl border border-black/10 px-3.5 py-2 text-xs font-semibold text-brand-dark/60">Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button type="button" onClick={() => { setTtEdition(tt.date); setNouveauJourTT(""); }} className="rounded-xl border border-black/10 px-3.5 py-2 text-xs font-semibold text-brand-dark hover:bg-black/5">Modifier</button>
                        <button type="button" onClick={() => retirerOccurrenceTT(tt.date)} className="rounded-xl border border-alert-soft/30 px-3.5 py-2 text-xs font-semibold text-alert-soft hover:bg-alert-soft/10">Ne pas le prendre</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {ttMessage && <p className="text-xs font-semibold text-brand-greendark mt-3">{ttMessage}</p>}
          </div>

        </Card>
      )}

      {onglet === "notifications" && notifications && (
        <Card className="p-6" id="notifications">
          <TitreSection icone="notifications" titre="Notifications" sousTitre="Recevez une alerte sur ce téléphone ou cet ordinateur (validations, refus, rappels…)." />
          {notifications}
        </Card>
      )}

      {onglet === "apparence" && apparence && (
        <Card className="p-6" id="apparence">
          <TitreSection icone="apparence" titre="Apparence" sousTitre="Affichage clair ou sombre de la plateforme." />
          {apparence}
        </Card>
      )}
    </div>
    </div>
  );
}

function TitreSection({ icone, titre, sousTitre }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/15 text-brand-greendark dark:text-brand-green" aria-hidden>
        <Icone name={icone} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-brand-dark">{titre}</h2>
        {sousTitre && <p className="mt-0.5 text-xs text-brand-dark/55">{sousTitre}</p>}
      </div>
    </div>
  );
}

function Info({ label, valeur }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark/45">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-brand-dark" title={valeur}>
        {valeur}
      </dd>
    </div>
  );
}
