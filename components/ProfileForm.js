"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

const ROLE_LABEL = {
  COLLABORATEUR: "Collaborateur",
  COMPTABLE: "Comptable",
  EMPLOYEUR: "Employeur / RH",
  ADMIN: "Administrateur",
};

const JOURS_LABEL = { LUNDI: "Lundi", MARDI: "Mardi", MERCREDI: "Mercredi", JEUDI: "Jeudi", VENDREDI: "Vendredi" };

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProfileForm({ user }) {
  const router = useRouter();
  const { update } = useSession();

  const [recevoirEmails, setRecevoirEmails] = useState(user.recevoirEmails);
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

  async function savePreference(value) {
    setRecevoirEmails(value);
    await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recevoirEmails: value }),
    });
  }

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
        const date = String(o.date).slice(0, 10);
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
      const sansDate = actuels.filter((o) => String(o.date).slice(0, 10) !== date);
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
    const exceptions = new Map(overrides.map((o) => [String(o.date).slice(0, 10), o.type]));
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
        await signOut({ callbackUrl: "/login" });
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
    <div className="grid lg:grid-cols-2 gap-6">
      {user.doitChangerMotDePasse && (
        <div className="lg:col-span-2 bg-brand-yellow/15 border border-brand-yellow/40 text-brand-dark text-sm rounded-xl px-4 py-3">
          Votre mot de passe a été réinitialisé par l'administrateur. Vous devez le changer ci-dessous avant de pouvoir accéder au reste de la plateforme.
        </div>
      )}

      <Card className="p-6">
        <h2 className="font-bold text-brand-dark mb-4">Informations</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Nom complet</dt>
            <dd className="font-medium text-brand-dark">{user.prenom} {user.nom}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Email</dt>
            <dd className="font-medium text-brand-dark">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Rôle</dt>
            <dd className="font-medium text-brand-dark">{ROLE_LABEL[user.role]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Service</dt>
            <dd className="font-medium text-brand-dark">{user.service || "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/50">Date d'entrée</dt>
            <dd className="font-medium text-brand-dark">
              {user.dateEntree ? new Date(user.dateEntree).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Non renseignée"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 pt-5 border-t border-black/5">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-brand-dark/70">Recevoir les notifications par email</span>
            <input type="checkbox" checked={recevoirEmails} onChange={(e) => savePreference(e.target.checked)} className="accent-brand-green w-4 h-4" />
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold text-brand-dark mb-4">Changer de mot de passe</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Mot de passe actuel</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Nouveau mot de passe</label>
            <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none" />
          </div>

          {error && <p className="text-sm text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-xl px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-brand-greendark bg-brand-green/10 border border-brand-green/30 rounded-xl px-3 py-2">{success}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : "Mettre à jour"}
          </Button>
        </form>
      </Card>

      {user.teletravailAutorise && (
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-bold text-brand-dark mb-1">Mes jours de télétravail</h2>
          <p className="text-sm text-brand-dark/60 mb-4">Choisissez jusqu'à {user.teletravailJoursMax} jour(s) fixe(s) par semaine. Tout ajout prend effet à partir d'aujourd'hui et ne modifie jamais les semaines déjà passées.</p>
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
    </div>
  );
}
