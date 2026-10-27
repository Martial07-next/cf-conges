// Formations du jour depuis le planning CF Formations (cf-formations) :
// sert à l'« Équipe en direct » pour afficher « En <formation> » quand un
// formateur anime une formation à l'heure actuelle.
//
// Variables d'environnement (Vercel, projet cf-conges) :
//   PLANNING_URL         ex. https://cf-formations.vercel.app
//   PLANNING_API_SECRET  même valeur que dans le projet cf-formations
// Sans elles (ou si le planning ne répond pas), rien ne change : « Au bureau ».

const sansAccents = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();

// « DUBARRE Antoine » et « Antoine Dubarre » donnent la même clé.
export function cleNom(...parts) {
  return sansAccents(parts.join(" ")).split(" ").filter(Boolean).sort().join(" ");
}

export async function formationsDuJour() {
  const base = process.env.PLANNING_URL;
  const secret = process.env.PLANNING_API_SECRET;
  if (!base || !secret) return [];
  const controle = new AbortController();
  const delai = setTimeout(() => controle.abort(), 4000);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/hooks/formations-du-jour`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: controle.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.formateurs) ? data.formateurs : [];
  } catch {
    return [];
  } finally {
    clearTimeout(delai);
  }
}

// Formations d'une personne : par e-mail, sinon par prénom + nom (ordre et accents indifférents).
export function formationsDe(formations, { email, prenom, nom }) {
  const mail = String(email || "").trim().toLowerCase();
  const cle = cleNom(prenom, nom);
  return formations
    .filter((f) => (mail && f.email && f.email.trim().toLowerCase() === mail) || cleNom(f.nom) === cle)
    .map((f) => ({ formation: f.formation, debut: f.debut, fin: f.fin, salle: f.salle || null }));
}
