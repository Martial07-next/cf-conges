"use client";

import { useState } from "react";
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

  const [teletravailJours, setTeletravailJours] = useState(user.teletravailJours || []);
  const [overrides, setOverrides] = useState(user.teletravailOverrides || []);
  const [dateRetrait, setDateRetrait] = useState("");
  const [dateAjout, setDateAjout] = useState("");
  const [ttMessage, setTtMessage] = useState("");

  async function savePreference(value) {
    setRecevoirEmails(value);
    await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recevoirEmails: value }),
    });
  }

  function toggleJourTT(jour) {
    let next;
    if (teletravailJours.includes(jour)) {
      next = teletravailJours.filter((j) => j !== jour);
    } else {
      if (teletravailJours.length >= user.teletravailJoursMax) return;
      next = [...teletravailJours, jour];
    }
    setTeletravailJours(next);
    fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teletravailJours: next }),
    }).then(() => setTtMessage("Enregistré ✓"));
  }

  async function echangerJourTT(e) {
    e.preventDefault();
    setTtMessage("");
    const res = await fetch("/api/profil/teletravail-echange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateRetrait, dateAjout }),
    });
    const data = await res.json();
    if (res.ok) {
      setTtMessage("Échange enregistré ✓");
      setOverrides((prev) => [
        ...prev.filter((o) => o.date !== dateRetrait && o.date !== dateAjout),
        { id: `tmp-retrait-${dateRetrait}`, date: dateRetrait, type: "RETRAIT" },
        { id: `tmp-ajout-${dateAjout}`, date: dateAjout, type: "AJOUT" },
      ]);
      setDateRetrait("");
      setDateAjout("");
      router.refresh();
    } else {
      setTtMessage(data.error || "Erreur.");
    }
  }

  async function annulerEchange(id) {
    if (id.startsWith("tmp-")) return; // pas encore rafraîchi depuis le serveur, on ignore
    const res = await fetch(`/api/profil/teletravail-echange/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      router.refresh();
    }
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
            <dd className="font-medium text-brand-dark">{user.service || "—"}</dd>
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
          <p className="text-sm text-brand-dark/60 mb-4">Choisissez jusqu'à {user.teletravailJoursMax} jour(s) fixe(s) par semaine.</p>
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

          <div className="mt-5 pt-4 border-t border-black/5">
            <p className="text-xs font-semibold text-brand-dark/70 mb-1">Échanger un jour de télétravail cette semaine</p>
            <p className="text-[11px] text-brand-dark/50 mb-2">
              1. Le jour habituel que vous retirez — 2. le nouveau jour à la place, pour cette semaine seulement.
            </p>
            <form onSubmit={echangerJourTT} className="flex flex-wrap items-center gap-2">
              <div>
                <span className="block text-[10px] text-brand-dark/40 mb-0.5">1. Jour retiré</span>
                <input type="date" required value={dateRetrait} onChange={(e) => setDateRetrait(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-black/10 bg-white text-xs focus-ring outline-none" />
              </div>
              <span className="text-brand-dark/30 mt-4">→</span>
              <div>
                <span className="block text-[10px] text-brand-dark/40 mb-0.5">2. Nouveau jour</span>
                <input type="date" required value={dateAjout} onChange={(e) => setDateAjout(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-black/10 bg-white text-xs focus-ring outline-none" />
              </div>
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-brand-dark text-brand-cream text-xs font-semibold mt-4">Échanger</button>
            </form>
            {ttMessage && <p className="text-xs text-brand-greendark mt-2">{ttMessage}</p>}
          </div>

          {overrides.length > 0 && (
            <div className="mt-5 pt-4 border-t border-black/5">
              <p className="text-xs font-semibold text-brand-dark/70 mb-2">Échanges en cours</p>
              <ul className="space-y-1.5">
                {overrides
                  .slice()
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((o) => (
                    <li key={o.id} className="flex items-center justify-between text-xs bg-brand-cream/70 border border-black/10 rounded-lg px-3 py-1.5">
                      <span>
                        {formatDate(o.date)} — {o.type === "AJOUT" ? "télétravail ajouté" : "télétravail retiré"}
                      </span>
                      <button onClick={() => annulerEchange(o.id)} className="text-alert-soft font-semibold hover:underline">
                        Annuler
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
