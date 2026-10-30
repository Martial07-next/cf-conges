// Formations depuis le planning CF Formations (cf-formations) : sert à
// l'« Équipe en direct » (« En <formation> » à l'heure actuelle) et au
// « Planning équipe » (case F « En formation » sur les jours concernés).
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

// Fiche de la session dans le planning (connexion au planning obligatoire pour l'ouvrir).
function lienSession(sessionId) {
  const base = process.env.PLANNING_URL;
  if (!base || !sessionId || !/^[0-9a-f-]{36}$/i.test(String(sessionId))) return null;
  return `${base.replace(/\/$/, "")}/sessions/${sessionId}`;
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
    .map((f) => ({ formation: f.formation, debut: f.debut, fin: f.fin, salle: f.salle || null, lien: lienSession(f.sessionId) }));
}

async function appelPlanning(chemin) {
  const base = process.env.PLANNING_URL;
  const secret = process.env.PLANNING_API_SECRET;
  if (!base || !secret) return null;
  const controle = new AbortController();
  const delai = setTimeout(() => controle.abort(), 4000);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}${chemin}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: controle.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(delai);
  }
}

// Formations jour par jour entre deux dates "AAAA-MM-JJ" (planning équipe) :
// [{ date, nom, email, formation, debut, fin, salle, sessionId }].
// Utilise /api/hooks/formations-periode de cf-formations ; tant que cette
// route n'existe pas, se rabat sur les formations du jour si aujourd'hui est
// dans la période. En cas d'erreur : aucune formation, le planning reste normal.
export async function formationsPeriode(du, au, aujourdhui) {
  const data = await appelPlanning(`/api/hooks/formations-periode?du=${du}&au=${au}`);
  if (Array.isArray(data?.formateurs)) return data.formateurs;
  if (!aujourdhui || aujourdhui < du || aujourdhui > au) return [];
  return (await formationsDuJour()).map((f) => ({ ...f, date: aujourdhui }));
}

// Index "idUtilisateur_AAAA-MM-JJ" -> formations de la personne ce jour-là.
export function indexerFormations(formations, users) {
  const index = new Map();
  if (!formations.length) return index;
  const parMail = new Map();
  const parNom = new Map();
  for (const u of users) {
    if (u.email) parMail.set(u.email.trim().toLowerCase(), u.id);
    parNom.set(cleNom(u.prenom, u.nom), u.id);
  }
  for (const f of formations) {
    const id = (f.email && parMail.get(f.email.trim().toLowerCase())) || parNom.get(cleNom(f.nom));
    if (!id || !f.date) continue;
    const cle = `${id}_${f.date}`;
    const liste = index.get(cle) || [];
    liste.push({ formation: f.formation, debut: f.debut, fin: f.fin, salle: f.salle || null, lien: lienSession(f.sessionId) });
    index.set(cle, liste);
  }
  return index;
}
