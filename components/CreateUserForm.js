"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

const ROLES = [
  { value: "COLLABORATEUR", label: "Collaborateur" },
  { value: "COMPTABLE", label: "Comptable" },
  { value: "EMPLOYEUR", label: "Employeur / RH" },
  { value: "ADMIN", label: "Administrateur" },
];

const emptyForm = { nom: "", prenom: "", email: "", service: "", role: "COLLABORATEUR", dateEntree: "" };

export default function CreateUserForm() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null); // { user, tempPassword }
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erreur.");
      return;
    }

    setCreated(data);
    setForm(emptyForm);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mb-5">
        + Ajouter un collaborateur
      </Button>
    );
  }

  return (
    <Card className="p-6 mb-6">
      {created ? (
        <div>
          <p className="font-bold text-brand-dark mb-1">Compte créé ✓</p>
          <p className="text-sm text-brand-dark/70 mb-4">
            Communiquez ces identifiants à {created.user.prenom} {created.user.nom} (il/elle pourra changer ce
            mot de passe depuis son profil.)
          </p>
          <div className="rounded-xl bg-brand-cream/70 border border-black/10 p-4 text-sm space-y-1 mb-4">
            <p>
              <span className="text-brand-dark/50">Email : </span>
              <span className="font-mono font-semibold">{created.user.email}</span>
            </p>
            <p>
              <span className="text-brand-dark/50">Mot de passe temporaire : </span>
              <span className="font-mono font-semibold">{created.tempPassword}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setCreated(null);
              setOpen(false);
            }}
          >
            Fermer
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <h2 className="font-bold text-brand-dark mb-1">Nouveau collaborateur</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Prénom</label>
              <input
                required
                value={form.prenom}
                onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Nom</label>
              <input
                required
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Email professionnel</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="prenom.nom@cf-reseaux.fr"
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Date d'entrée</label>
              <input
                type="date"
                value={form.dateEntree}
                onChange={(e) => setForm((f) => ({ ...f, dateEntree: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Service</label>
            <input
              value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
              placeholder="Bureau d'études, Formation…"
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
            />
          </div>

          {error && <p className="text-xs text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading}>
              {loading ? "Création…" : "Créer le compte"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
