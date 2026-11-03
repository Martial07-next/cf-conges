// MatthiasBot : questions sur les collègues (où est X, qui est absent demain,
// quand revient Y, qui est dans le pôle Z…). On ne donne que ce que le
// planning équipe montre déjà à tout le monde, en restant discret sur le motif
// d'une absence (« en congé », « absent »), jamais de solde ni de date de naissance.
import { dateFranceISO } from "./dateFrance";
import { estJourFerie, joursFeries } from "./joursFeries";
import { indexerEvenements, creneauxDuJour } from "./agendaDirection";
import { etatAgenda, etatDemande, etatFerie, etatTeletravail, etatFormation, formationsSurPeriode, memeEtat, categorieJournee, ETAT_BUREAU } from "./etatJournee";
import { formationsPeriode, indexerFormations } from "./planningFormations";
import { estAnniversaireLe } from "./anniversaires";

const NORMALISER = (texte = "") =>
  texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9/.-]+/g, " ").trim();

const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const JOURS_CODE = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];
const MOIS = { janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11 };

// Mots qui ressemblent à des prénoms / noms mais n'en sont pas dans une question.
const PAS_UN_NOM = new Set([
  "matthiasbot", "osefbot", "bureau", "conge", "conges", "absent", "absente", "absents", "absence", "absences", "demain", "hier", "lundi", "mardi",
  "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "semaine", "planning", "pole", "equipe", "formation", "formations", "matin", "aprem",
  "apres", "midi", "soir", "journee", "aujourd", "teletravail", "present", "presente", "revient", "retour", "quand", "quel", "quelle", "est",
  "sont", "sera", "seront", "prochain", "prochaine", "prochaines", "travail", "travaille", "joignable", "dispo", "disponible", "vacances",
  "comment", "combien", "pourquoi", "merci", "bonjour", "salut", "solde", "demande", "demandes", "ferie", "feries", "anniversaire",
]);

// ---------- Dates (midi UTC pour éviter tout décalage) ----------

function jourUTC(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
function isoUTC(date) {
  return date.toISOString().slice(0, 10);
}
function ajouterJours(iso, n) {
  const d = jourUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoUTC(d);
}
function estWeekendISO(iso) {
  const j = jourUTC(iso).getUTCDay();
  return j === 0 || j === 6;
}
export function libelleJour(iso, aujourdhui) {
  if (iso === aujourdhui) return "aujourd’hui";
  if (iso === ajouterJours(aujourdhui, 1)) return "demain";
  if (iso === ajouterJours(aujourdhui, 2)) return "après-demain";
  if (iso === ajouterJours(aujourdhui, -1)) return "hier";
  const d = jourUTC(iso);
  const txt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
  return `le ${txt}`;
}
function dateCourte(iso) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(jourUTC(iso));
}

// Jour visé par la question : aujourd'hui, demain, après-demain, un jour de
// la semaine (le prochain, aujourd'hui compris), « 12/11 » ou « 12 novembre ».
// Renvoie aussi une plage pour « cette semaine » / « la semaine prochaine ».
export function periodeDeLaQuestion(q, aujourdhui) {
  if (/\bsemaine prochaine\b/.test(q)) {
    const lundi = ajouterJours(aujourdhui, ((8 - jourUTC(aujourdhui).getUTCDay()) % 7) || 7);
    return { du: lundi, au: ajouterJours(lundi, 4), plage: true, libelle: "la semaine prochaine" };
  }
  if (/\bcette semaine\b/.test(q)) {
    const j = jourUTC(aujourdhui).getUTCDay();
    const lundi = ajouterJours(aujourdhui, j === 0 ? -6 : 1 - j);
    return { du: aujourdhui > lundi ? aujourdhui : lundi, au: ajouterJours(lundi, 4), plage: true, libelle: "cette semaine" };
  }
  let iso = null;
  if (/\bapres[- ]?demain\b/.test(q)) iso = ajouterJours(aujourdhui, 2);
  else if (/\bdemain\b/.test(q)) iso = ajouterJours(aujourdhui, 1);
  else if (/\bhier\b/.test(q)) iso = ajouterJours(aujourdhui, -1);
  if (!iso) {
    const m = q.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
    if (m) {
      let y = m[3] ? Number(m[3]) : Number(aujourdhui.slice(0, 4));
      if (y < 100) y += 2000;
      iso = isoUTC(new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1]), 12)));
    }
  }
  if (!iso) {
    const m = q.match(/\b(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?\b/);
    if (m) iso = isoUTC(new Date(Date.UTC(Number(m[3]) || Number(aujourdhui.slice(0, 4)), MOIS[m[2]], Number(m[1]), 12)));
  }
  if (!iso) {
    const jour = JOURS_SEMAINE.findIndex((j) => new RegExp(`\\b${j}\\b`).test(q));
    if (jour >= 0) {
      const ecart = (jour - jourUTC(aujourdhui).getUTCDay() + 7) % 7;
      const prochain = /\b(prochain|suivant)\b/.test(q) && ecart === 0 ? 7 : ecart;
      iso = ajouterJours(aujourdhui, prochain);
    }
  }
  if (!iso || Number.isNaN(jourUTC(iso).getTime())) iso = aujourdhui;
  return { du: iso, au: iso, plage: false, libelle: libelleJour(iso, aujourdhui) };
}

// ---------- Collègues ----------

const SELECT_COLLEGUE = {
  id: true, prenom: true, nom: true, email: true, pole: true, service: true, role: true,
  dateNaissance: true, dateEntree: true, dateSortie: true, statutCompte: true, teletravailAutorise: true,
};

// Personnes visibles dans le planning équipe (mêmes règles que la page).
export async function chargerCollegues(prisma) {
  const users = await prisma.user.findMany({
    where: { statutCompte: "ACTIF", OR: [{ visiblePlanning: true }, { role: "EMPLOYEUR" }, { pole: "Direction" }] },
    select: SELECT_COLLEGUE,
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
  });
  return users.filter((u) => u.role !== "ADMIN" || u.pole);
}

export function nomComplet(u) {
  return `${u.prenom} ${u.nom.charAt(0)}${u.nom.slice(1).toLowerCase()}`;
}

// Collègues cités dans la question : prénom, nom, ou les deux (accents et
// fautes de frappe légères tolérés). Le prénom + nom l'emporte sur le prénom seul.
// Correspondance exacte d'abord ; une faute de frappe (1 lettre, mots de 5
// lettres et plus) n'est tolérée que si aucun nom exact n'a été trouvé.
export function colleguesCites(q, collegues) {
  const mots = q.split(/\s+/).filter((m) => m.length >= 3 && !PAS_UN_NOM.has(m));
  const chercher = (egal) => {
    const trouves = [];
    for (const u of collegues) {
      const prenom = NORMALISER(u.prenom).split(/\s+/);
      const nom = NORMALISER(u.nom).split(/\s+/);
      const surPrenom = prenom.some((p) => mots.some((m) => egal(m, p)));
      const surNom = nom.some((n) => n.length >= 3 && mots.some((m) => egal(m, n)));
      if (surPrenom || surNom) trouves.push({ u, score: (surPrenom ? 1 : 0) + (surNom ? 2 : 0) });
    }
    if (!trouves.length) return [];
    const meilleur = Math.max(...trouves.map((t) => t.score));
    return trouves.filter((t) => t.score === meilleur).map((t) => t.u);
  };
  const exacts = chercher((a, b) => a === b);
  if (exacts.length) return exacts;
  return chercher((a, b) => Math.min(a.length, b.length) >= 5 && distance(a, b) <= 1);
}

function distance(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return m[a.length][b.length];
}

// ---------- Présence (même logique que le planning équipe) ----------

// Charge tout ce qu'il faut pour connaître la présence de ces personnes entre
// deux dates, et renvoie etat(user, iso) -> { matin, aprem } | { weekend } | null.
export async function presences(prisma, users, du, au, { avecFormations = true } = {}) {
  const ids = users.map((u) => u.id);
  const debut = new Date(`${du}T00:00:00.000Z`);
  const fin = new Date(`${au}T23:59:59.999Z`);
  const aujourdhui = dateFranceISO();
  const [demandes, overrides, joursFixes, evenements, feriesTravailles, formations] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId: { in: ids }, statut: "VALIDE", dateDebut: { lte: fin }, dateFin: { gte: debut } },
      select: { userId: true, dateDebut: true, dateFin: true, demiJournee: true, demiJourneePeriode: true, leaveType: { select: { code: true, libelle: true, couleur: true } } },
    }),
    prisma.teletravailOverride.findMany({ where: { userId: { in: ids }, date: { gte: debut, lte: fin } }, select: { userId: true, date: true, type: true } }),
    prisma.teletravailJourFixe.findMany({
      where: { userId: { in: ids }, dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] },
      select: { userId: true, jour: true, dateDebut: true, dateFin: true },
    }),
    prisma.agendaEvenement.findMany({ where: { userId: { in: ids }, dateDebut: { lte: fin }, dateFin: { gte: debut } } }),
    prisma.jourFerieDecision.findMany({ where: { userId: { in: ids }, date: { gte: debut, lte: fin }, statut: "VALIDE", souhaiteTravailler: true }, select: { userId: true, date: true } }),
    avecFormations ? formationsPeriode(du, au, aujourdhui).catch(() => []) : Promise.resolve([]),
  ]);

  const iso = (d) => dateFranceISO(new Date(d));
  const demandesPar = new Map();
  for (const d of demandes) {
    const l = demandesPar.get(d.userId) || [];
    l.push({ ...d, du: iso(d.dateDebut), au: iso(d.dateFin) });
    demandesPar.set(d.userId, l);
  }
  const overrideCle = new Set(overrides.map((o) => `${o.userId}_${iso(o.date)}_${o.type}`));
  const fixesPar = new Map();
  for (const f of joursFixes) {
    const l = fixesPar.get(f.userId) || [];
    l.push({ jour: f.jour, du: iso(f.dateDebut), au: f.dateFin ? iso(f.dateFin) : null });
    fixesPar.set(f.userId, l);
  }
  const agenda = indexerEvenements(evenements);
  const feriesOk = new Set(feriesTravailles.map((f) => `${f.userId}_${iso(f.date)}`));
  const formationsPar = indexerFormations(formations, users);

  function teletravail(u, jour) {
    if (overrideCle.has(`${u.id}_${jour}_AJOUT`)) return true;
    if (overrideCle.has(`${u.id}_${jour}_RETRAIT`)) return false;
    if (!u.teletravailAutorise) return false;
    const code = JOURS_CODE[jourUTC(jour).getUTCDay()];
    return (fixesPar.get(u.id) || []).some((f) => f.jour === code && f.du <= jour && (!f.au || f.au >= jour));
  }

  return function etat(u, jour) {
    if (u.dateEntree && jour < iso(u.dateEntree)) return null;
    if (u.dateSortie && jour > iso(u.dateSortie)) return null;
    if (estWeekendISO(jour)) return { weekend: true };
    const creneaux = creneauxDuJour(agenda, u.id, jour);
    if (creneaux) return { matin: etatAgenda(creneaux.MATIN), aprem: etatAgenda(creneaux.APREM) };
    const ferie = estJourFerie(jourUTC(jour));
    const base = ferie ? etatFerie(ferie.libelle, feriesOk.has(`${u.id}_${jour}`)) : teletravail(u, jour) ? etatTeletravail() : ETAT_BUREAU;
    const duJour = (demandesPar.get(u.id) || []).filter((d) => d.du <= jour && jour <= d.au);
    const enFormation = formationsPar.get(`${u.id}_${jour}`);
    const pour = (periode) => {
      const r = duJour.find((d) => !d.demiJournee || d.demiJourneePeriode === periode);
      if (r && r.leaveType.code !== "TT") return etatDemande(r.leaveType);
      const f = formationsSurPeriode(enFormation, periode);
      if (f.length) return etatFormation(f);
      return r ? etatDemande(r.leaveType) : base;
    };
    return { matin: pour("MATIN"), aprem: pour("APREM") };
  };
}

// Libellé discret d'une demi-journée : le motif exact d'une absence n'est pas
// donné (arrêt, absence spéciale…), seulement « en congé » ou « absent ».
// "09:00" -> "9h", "13:30" -> "13h30".
function heure(h) {
  return h.replace(/^0(\d)/, "$1").replace(":", "h").replace(/h00$/, "h");
}

function enMots(etat) {
  if (!etat) return "absent(e)";
  if (etat.type === "bureau") return "au bureau";
  if (etat.type === "teletravail") return "en télétravail";
  if (etat.type === "formation") return `en formation${etat.detail ? ` (${etat.detail})` : ""}`;
  if (etat.type === "ferie") return `en jour férié (${etat.detail})`;
  if (etat.type === "ferie_travaille") return "au bureau (férié travaillé)";
  if (etat.type === "agenda") {
    const lieu = etat.lieu ? ` · ${etat.lieu}` : "";
    if (etat.code === "ABS") return "absent(e)";
    if (etat.code === "IND") return "indisponible";
    return `${etat.label.charAt(0).toLowerCase()}${etat.label.slice(1)}${lieu}`;
  }
  if (["CP", "RH", "C"].includes(etat.code)) return "en congé";
  if (etat.code === "ec") return "à l’école";
  if (etat.code === "ext") return "à l’extérieur (visite, formation…)";
  return "absent(e)";
}

function estAbsent(etat) {
  return !!etat && (etat.type === "conge" || etat.type === "ferie" || (etat.type === "agenda" && etat.code === "ABS"));
}

export function phraseJournee(etats) {
  if (!etats) return "pas encore (ou plus) dans l’entreprise ce jour-là";
  if (etats.weekend) return "en week-end";
  if (memeEtat(etats.matin, etats.aprem)) return enMots(etats.matin);
  return `${enMots(etats.matin)} le matin et ${enMots(etats.aprem)} l’après-midi`;
}

function joignable(etats) {
  if (!etats || etats.weekend) return null;
  const j = [etats.matin, etats.aprem].map((e) => e?.joignable);
  if (j.every((x) => x === true)) return " Joignable.";
  if (j.every((x) => x === false)) return " Non joignable.";
  if (j[0] === true && j[1] === false) return " Joignable le matin, pas l’après-midi.";
  if (j[0] === false && j[1] === true) return " Joignable l’après-midi seulement.";
  return "";
}

// ---------- Réponses ----------

const MOTS_PRESENCE = ["ou", "est ou", "absence", "absences", "aprem", "apres midi", "matin", "ou est", "ou sera", "est la", "sera la", "present", "presente", "absent", "absente", "au bureau", "teletravail", "tt", "conge", "vacances", "dispo", "disponible", "joignable", "revient", "retour", "rentre", "formation", "aujourd hui", "demain", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "semaine", "il fait quoi", "elle fait quoi", "travaille"];
const MOTS_QUI = ["qui est", "qui sont", "qui sera", "qui seront", "qui travaille", "qui bosse", "qui a", "qui fete", "liste", "combien de personnes", "combien de collegues", "combien sont", "combien de gens", "ya qui", "y a qui", "il y a qui"];

// Mots entiers seulement (« tt » ne doit pas trouver « attente »).
function contient(q, mots) {
  return mots.some((m) => new RegExp(`(^|\\s)${m}(\\s|$)`).test(q));
}

// Point d'entrée : renvoie { reponse, navigation } ou null si la question ne
// porte pas sur les collègues.
export async function repondreEquipe({ prisma, q: brut, moi }) {
  const aujourdhui = dateFranceISO();
  const q = NORMALISER(brut);
  const qSansBot = q.replace(/\b(matthias ?bot|osef ?bot)\b/g, " ");
  const question = /^(et )?qui\b/.test(qSansBot) || /\bqui (est|sont|sera|seront|etait|travaille|bosse|fete|a son|manque)\b/.test(qSansBot) || contient(qSansBot, MOTS_QUI);
  const parlePole = /\b(pole|poles|service|referent|cadre|responsable|valide mes|qui valide|manager|chef|dans quel pole|quelle equipe|son equipe|mon equipe)\b/.test(qSansBot);
  const parleAnniv = /\b(anniv|anniversaire|anniversaires|fete ses|souffle)\b/.test(qSansBot);
  const surMoiTexte = /\b(je suis|je serai|suis je|serai je|je bosse|je travaille|j ai quoi|mon planning de)\b/.test(qSansBot);

  const collegues = await chargerCollegues(prisma);
  const trouves = colleguesCites(qSansBot, collegues);
  // Se citer soi-même (« Sam est où vendredi ? » posé par Sam) = question sur soi.
  const surSoiParSonNom = trouves.length === 1 && trouves[0].id === moi.id;
  const cites = trouves.filter((u) => u.id !== moi.id);
  const parlePresence = contient(qSansBot, MOTS_PRESENCE);
  const surMoi = surMoiTexte || surSoiParSonNom;

  // Ni collègue cité, ni liste, ni pôle : ce n'est pas pour ce module.
  if (!cites.length && !question && !parlePole && !parleAnniv && !surMoi) {
    const inconnu = qSansBot.match(/\b(?:ou est|ou sera|ou se trouve|quand revient|ou en est) ([a-z]{3,})\b/);
    if (inconnu && !PAS_UN_NOM.has(inconnu[1]) && !["mon", "ma", "mes", "le", "la", "les", "ma demande"].includes(inconnu[1])) {
      return { reponse: `Je ne trouve personne qui s’appelle « ${inconnu[1].charAt(0).toUpperCase()}${inconnu[1].slice(1)} » dans le planning équipe. Vérifie l’orthographe ou donne-moi son nom de famille 🙂`, navigation: null };
    }
    return null;
  }

  // Données privées : solde, salaire, date de naissance, âge.
  if (cites.length && /\b(solde|cp restant|salaire|paie|age|ans|ne le|nee le|date de naissance|adresse|telephone|numero)\b/.test(qSansBot)) {
    return { reponse: "Je protège les informations personnelles des collègues (solde, date de naissance, coordonnées…). Je peux te dire s’ils sont au bureau, en télétravail ou absents, comme dans le planning équipe.", navigation: null };
  }

  if (parleAnniv) return anniversaires({ q: qSansBot, collegues, cites, aujourdhui });
  const presenceDemandee = parlePresence || /\b(la|absent|absents|present|presents)\b/.test(qSansBot);
  if (parlePole && !(presenceDemandee && !/\b(valide|referent|cadre|responsable|manager|chef|dans quel)\b/.test(qSansBot))) {
    const r = infosPole({ q: qSansBot, collegues, cites, moi });
    if (r) return r;
  }

  if (cites.length > 1 && !question) {
    const noms = cites.slice(0, 5).map(nomComplet).join(", ");
    return { reponse: `Je connais plusieurs personnes qui correspondent : ${noms}. Précise le nom de famille 🙂`, navigation: null };
  }

  const periode = { ...periodeDeLaQuestion(qSansBot, aujourdhui), q: qSansBot };

  // Un prénom sans question de présence (« merci Hugo ») : pas pour ce module.
  if (cites.length === 1 && !question && !parlePresence && !/\b(est|sera|etait|fait|bosse|travaille|dispo|revient|rentre)\b/.test(qSansBot)) return null;

  if (cites.length === 1) {
    const u = cites[0];
    if (/\b(revient|retour|rentre|reviendra|de retour)\b/.test(qSansBot)) return quandRevient({ prisma, u, aujourdhui });
    if (/\b(prochain|prochaine|prochains|prochaines) (conge|conges|absence|absences|vacances)\b|\babsences? a venir\b|\bpart (quand|en conge|en vacances)\b|\bses (conges|absences|vacances)\b/.test(qSansBot)) return prochainesAbsences({ prisma, u, aujourdhui });
    return presenceDe({ prisma, u, periode, aujourdhui });
  }

  if (question) return listeEquipe({ prisma, q: qSansBot, collegues, periode, aujourdhui, moi });

  // « Je suis en télétravail demain ? », « je bosse lundi ? »
  if (surMoi && (parlePresence || periode.du !== aujourdhui || /\b(bosse|travaille|la)\b/.test(qSansBot))) return presenceDe({ prisma, u: moi, periode, aujourdhui, toi: true });
  return null;
}

async function presenceDe({ prisma, u, periode, aujourdhui, toi = false }) {
  const sujet = toi ? "Tu" : nomComplet(u);
  const etat = await presences(prisma, [u], periode.du, periode.au);
  const lien = { href: `/planning?vue=${periode.plage ? "semaine" : "jour"}&${periode.plage ? "semaine" : "jour"}=${periode.du}`, label: "Voir le planning" };
  if (periode.plage) {
    const lignes = [];
    for (let j = periode.du; j <= periode.au; j = ajouterJours(j, 1)) lignes.push(`• ${dateCourte(j)} : ${phraseJournee(etat(u, j))}`);
    return { reponse: `${toi ? "Ton planning" : nomComplet(u)} ${periode.libelle} :\n${lignes.join("\n")}`, navigation: lien };
  }
  const e = etat(u, periode.du);
  // « … cet aprèm ? », « … ce matin ? » : seulement la demi-journée demandée.
  const moitie = /\b(aprem|apres midi|cet apres midi|cet aprem)\b/.test(periode.q || "") ? "aprem" : /\b(ce matin|le matin|matin)\b/.test(periode.q || "") ? "matin" : null;
  if (moitie && e && !e.weekend) {
    const x = e[moitie];
    const v = toi ? (periode.du < aujourdhui ? "étais" : periode.du === aujourdhui ? "es" : "seras") : periode.du < aujourdhui ? "était" : periode.du === aujourdhui ? "est" : "sera";
    const quand =
      periode.du === aujourdhui ? (moitie === "aprem" ? "cet après-midi" : "ce matin")
      : periode.libelle === "demain" ? (moitie === "aprem" ? "demain après-midi" : "demain matin")
      : `${periode.libelle}, ${moitie === "aprem" ? "l’après-midi" : "le matin"}`;
    const j = x?.joignable === true ? " Joignable." : x?.joignable === false ? " Non joignable." : "";
    return { reponse: `${sujet} ${v} ${enMots(x)} ${quand}.${toi ? "" : j}`, navigation: lien };
  }
  const verbe = toi ? (periode.du < aujourdhui ? "étais" : periode.du === aujourdhui ? "es" : "seras") : periode.du < aujourdhui ? "était" : periode.du === aujourdhui ? "est" : "sera";
  let reponse = `${sujet} ${verbe} ${phraseJournee(e)} ${periode.libelle}.${toi ? "" : joignable(e) || ""}`;
  const formations = [e?.matin, e?.aprem].filter((x) => x?.type === "formation").flatMap((x) => x.formations || []);
  if (formations.length) {
    const f = formations[0];
    reponse += ` Formation « ${f.formation} »${f.debut && f.fin ? ` de ${heure(f.debut)} à ${heure(f.fin)}` : ""}${f.salle ? `, ${f.salle}` : ""}.`;
    if (f.lien) return { reponse, navigation: { href: f.lien, label: "Voir la session de formation" } };
  }
  if (estAbsent(e?.matin) && estAbsent(e?.aprem) && !(e.matin.type === "ferie" && e.aprem.type === "ferie")) {
    const retour = await prochainJourPresent({ prisma, u, depuis: periode.du });
    if (retour) reponse += ` Retour prévu ${libelleJour(retour, aujourdhui)}.`;
  }
  return { reponse, navigation: lien };
}

// Premier jour ouvré où la personne n'est plus absente (60 jours max).
async function prochainJourPresent({ prisma, u, depuis }) {
  const au = ajouterJours(depuis, 60);
  const etat = await presences(prisma, [u], depuis, au, { avecFormations: false });
  for (let j = ajouterJours(depuis, 1); j <= au; j = ajouterJours(j, 1)) {
    const e = etat(u, j);
    if (!e || e.weekend) continue;
    if (!(estAbsent(e.matin) && estAbsent(e.aprem))) return j;
  }
  return null;
}

async function quandRevient({ prisma, u, aujourdhui }) {
  const etat = await presences(prisma, [u], aujourdhui, aujourdhui, { avecFormations: false });
  const e = etat(u, aujourdhui);
  const lien = { href: `/planning?vue=semaine&semaine=${aujourdhui}`, label: "Voir le planning" };
  if (e && !e.weekend && !(estAbsent(e.matin) && estAbsent(e.aprem))) {
    return { reponse: `${nomComplet(u)} n’est pas absent(e) aujourd’hui : ${phraseJournee(e)}.`, navigation: lien };
  }
  const retour = await prochainJourPresent({ prisma, u, depuis: aujourdhui });
  if (!retour) return { reponse: `Je ne vois pas de date de retour pour ${nomComplet(u)} dans les 60 prochains jours.`, navigation: lien };
  return { reponse: `${nomComplet(u)} revient ${libelleJour(retour, aujourdhui)} 👋`, navigation: lien };
}

async function prochainesAbsences({ prisma, u, aujourdhui }) {
  const au = ajouterJours(aujourdhui, 90);
  const etat = await presences(prisma, [u], aujourdhui, au, { avecFormations: false });
  const periodes = [];
  let courante = null;
  for (let j = aujourdhui; j <= au; j = ajouterJours(j, 1)) {
    const e = etat(u, j);
    if (e?.weekend) continue;
    const absent = e && (estAbsent(e.matin) || estAbsent(e.aprem)) && !(e.matin.type === "ferie" && e.aprem.type === "ferie");
    if (absent) {
      const libelle = phraseJournee(e);
      if (courante && courante.libelle === libelle && courante.fin === dernierOuvre(j)) courante.fin = j;
      else periodes.push((courante = { debut: j, fin: j, libelle }));
    }
  }
  const lien = { href: `/planning?vue=mois&mois=${aujourdhui.slice(0, 7)}`, label: "Voir le planning" };
  if (!periodes.length) return { reponse: `Aucune absence prévue pour ${nomComplet(u)} dans les 3 prochains mois.`, navigation: lien };
  const lignes = periodes.slice(0, 5).map((p) => `• ${p.debut === p.fin ? dateCourte(p.debut) : `du ${dateCourte(p.debut)} au ${dateCourte(p.fin)}`} : ${p.libelle}`);
  return { reponse: `Prochaines absences de ${nomComplet(u)} :\n${lignes.join("\n")}`, navigation: lien };
}

// Jour ouvré précédent (pour regrouper une absence vendredi + lundi).
function dernierOuvre(iso) {
  let j = ajouterJours(iso, -1);
  while (estWeekendISO(j)) j = ajouterJours(j, -1);
  return j;
}

async function listeEquipe({ prisma, q, collegues, periode, aujourdhui, moi }) {
  const poleCite = collegues.map((u) => u.pole).filter(Boolean).find((p) => q.includes(NORMALISER(p)));
  const monPole = /\bmon pole|mon equipe|ma team\b/.test(q) ? moi.pole : null;
  const pole = poleCite || monPole;
  const groupe = collegues.filter((u) => !pole || u.pole === pole);
  const jour = periode.du;
  const lien = { href: `/planning?vue=jour&jour=${jour}${pole ? `&pole=${encodeURIComponent(pole)}` : ""}`, label: "Voir le planning du jour" };
  if (periode.plage) return listeSurPlage({ prisma, q, groupe, periode, pole });
  if (estWeekendISO(jour)) return { reponse: `${periode.libelle.charAt(0).toUpperCase()}${periode.libelle.slice(1)}, c’est le week-end 😎 Personne n’est attendu au bureau.`, navigation: null };

  const ferieDuJour = estJourFerie(jourUTC(jour));
  const etat = await presences(prisma, groupe, jour, jour);
  const categories = { bureau: [], teletravail: [], absent: [], formation: [], dehors: [], ferie: [] };
  for (const u of groupe) {
    const e = etat(u, jour);
    if (!e || e.weekend) continue;
    categories[categorieJournee(e.matin, e.aprem)].push({ u, e });
  }
  const noms = (liste, details = false) =>
    liste.map(({ u, e }) => (details && !memeEtat(e.matin, e.aprem) ? `${nomComplet(u)} (${phraseJournee(e)})` : nomComplet(u))).join(", ");
  const quand = periode.libelle;
  const dans = pole ? ` (${pole})` : "";
  const verbe = jour < aujourdhui ? "était" : jour === aujourdhui ? "est" : "sera";
  const verbes = jour < aujourdhui ? "étaient" : jour === aujourdhui ? "sont" : "seront";
  const phrase = (liste, seul, plusieurs, vide) =>
    liste.length === 0 ? vide : liste.length === 1 ? `${noms(liste, true)} ${verbe} ${seul} ${quand}${dans}.` : `${liste.length} personnes ${verbes} ${plusieurs} ${quand}${dans} : ${noms(liste, true)}.`;

  // Jour férié chômé par (presque) tout le monde : on le dit simplement.
  if (ferieDuJour && categories.ferie.length >= groupe.length / 2) {
    const auTravail = [...categories.bureau, ...categories.teletravail];
    return { reponse: `${quand.charAt(0).toUpperCase()}${quand.slice(1)}, c’est férié (${ferieDuJour.libelle}) 🎉${auTravail.length ? ` Au travail quand même : ${noms(auTravail)}.` : ""}`, navigation: lien };
  }
  if (/\b(teletravail|tt|distance|maison)\b/.test(q)) {
    return { reponse: phrase(categories.teletravail, "en télétravail", "en télétravail", `Personne en télétravail ${quand}${dans}.`), navigation: lien };
  }
  if (/\bformation\b/.test(q)) {
    const liste = categories.formation;
    const detail = liste.map(({ u, e }) => {
      const f = [e.matin, e.aprem].find((x) => x?.type === "formation");
      return `${nomComplet(u)}${f?.detail ? ` (${f.detail})` : ""}`;
    });
    if (!liste.length) return { reponse: `Personne en formation ${quand}${dans} (selon le planning CF Formations).`, navigation: lien };
    if (liste.length === 1) {
      const [nom, ...reste] = detail[0].split(" (");
      return { reponse: `${nom} ${verbe} en formation ${quand}${dans}${reste.length ? ` (${reste.join(" (")}` : ""}.`, navigation: lien };
    }
    return { reponse: `${liste.length} formateurs ${verbes} en formation ${quand}${dans} : ${detail.join(", ")}.`, navigation: lien };
  }
  if (/\b(absent|absents|absente|absentes|conge|conges|vacances|off|manque)\b/.test(q)) {
    const liste = [...categories.absent, ...categories.ferie];
    return { reponse: phrase(liste, "absent(e)", "absentes", `Personne n’est absent ${quand}${dans} 🎉`), navigation: lien };
  }
  if (/\b(bureau|present|presents|sur place|sur site|la)\b/.test(q)) {
    return { reponse: phrase(categories.bureau, "au bureau", "au bureau", `Personne au bureau ${quand}${dans}.`), navigation: lien };
  }

  // Vue d'ensemble.
  const lignes = [
    categories.bureau.length && `🟢 Au bureau (${categories.bureau.length}) : ${noms(categories.bureau, true)}`,
    categories.teletravail.length && `🔵 Télétravail (${categories.teletravail.length}) : ${noms(categories.teletravail, true)}`,
    categories.formation.length && `🎓 En formation (${categories.formation.length}) : ${noms(categories.formation, true)}`,
    categories.dehors.length && `🟣 Réunion / déplacement (${categories.dehors.length}) : ${noms(categories.dehors, true)}`,
    categories.absent.length && `🔴 Absents (${categories.absent.length}) : ${noms(categories.absent, true)}`,
    categories.ferie.length && `⚪ Férié (${categories.ferie.length})`,
  ].filter(Boolean);
  return { reponse: `L’équipe ${quand}${dans} :\n${lignes.join("\n")}`, navigation: lien };
}

// Catégorie demandée dans une question « qui est… » (null = vue d'ensemble).
function categorieDemandee(q) {
  if (/\b(teletravail|tt|distance|maison)\b/.test(q)) return ["teletravail", "en télétravail"];
  if (/\bformation\b/.test(q)) return ["formation", "en formation"];
  if (/\b(absent|absents|absente|absentes|conge|conges|vacances|off|manque)\b/.test(q)) return ["absent", "absents"];
  if (/\b(bureau|present|presents|sur place|sur site|la)\b/.test(q)) return ["bureau", "au bureau"];
  return null;
}

// « Qui est en télétravail cette semaine ? » : une ligne par jour ouvré.
async function listeSurPlage({ prisma, q, groupe, periode, pole }) {
  const etat = await presences(prisma, groupe, periode.du, periode.au);
  const demande = categorieDemandee(q);
  const lignes = [];
  for (let j = periode.du; j <= periode.au; j = ajouterJours(j, 1)) {
    if (estWeekendISO(j)) continue;
    const cat = { bureau: [], teletravail: [], absent: [], formation: [], dehors: [], ferie: [] };
    for (const u of groupe) {
      const e = etat(u, j);
      if (e && !e.weekend) cat[categorieJournee(e.matin, e.aprem)].push(u);
    }
    const ferie = estJourFerie(jourUTC(j));
    if (ferie && cat.ferie.length >= groupe.length / 2) {
      lignes.push(`• ${dateCourte(j)} : férié (${ferie.libelle}) 🎉`);
      continue;
    }
    if (demande) {
      const liste = demande[0] === "absent" ? cat.absent : cat[demande[0]];
      lignes.push(`• ${dateCourte(j)} : ${liste.length ? liste.map(nomComplet).join(", ") : "personne"}`);
    } else {
      lignes.push(`• ${dateCourte(j)} : ${cat.bureau.length} au bureau, ${cat.teletravail.length} en TT, ${cat.absent.length + cat.ferie.length} absent(s)${cat.formation.length ? `, ${cat.formation.length} en formation` : ""}`);
    }
  }
  const titre = demande ? `${demande[1].charAt(0).toUpperCase()}${demande[1].slice(1)} ${periode.libelle}` : `L’équipe ${periode.libelle}`;
  return {
    reponse: `${titre}${pole ? ` (${pole})` : ""} :\n${lignes.join("\n")}`,
    navigation: { href: `/planning?vue=semaine&semaine=${periode.du}${pole ? `&pole=${encodeURIComponent(pole)}` : ""}`, label: "Voir le planning de la semaine" },
  };
}

function anniversaires({ q, collegues, cites, aujourdhui }) {
  if (cites.length === 1) {
    const u = cites[0];
    return {
      reponse: estAnniversaireLe(u.dateNaissance, aujourdhui)
        ? `Oui ! C’est l’anniversaire de ${nomComplet(u)} aujourd’hui 🎂 Pense à lui souhaiter.`
        : `Ce n’est pas l’anniversaire de ${nomComplet(u)} aujourd’hui. Je ne donne pas les dates de naissance, mais un gâteau 🎂 apparaît à côté de son nom dans le planning le jour J.`,
      navigation: null,
    };
  }
  const demain = ajouterJours(aujourdhui, 1);
  const auj = collegues.filter((u) => estAnniversaireLe(u.dateNaissance, aujourdhui));
  const dem = collegues.filter((u) => estAnniversaireLe(u.dateNaissance, demain));
  if (/\bdemain\b/.test(q)) {
    return { reponse: dem.length ? `Demain, on fête l’anniversaire de ${dem.map(nomComplet).join(", ")} 🎂` : "Pas d’anniversaire demain dans l’équipe.", navigation: null };
  }
  if (auj.length) return { reponse: `Aujourd’hui, on fête l’anniversaire de ${auj.map(nomComplet).join(", ")} 🎂🎉`, navigation: null };
  return { reponse: `Pas d’anniversaire aujourd’hui dans l’équipe.${dem.length ? ` Demain : ${dem.map(nomComplet).join(", ")} 🎂` : ""}`, navigation: null };
}

const POLES_LIBELLES = (pole) => pole || "sans pôle";

function infosPole({ q, collegues, cites, moi }) {
  // « Qui valide mes congés ? » / « qui est mon référent ? »
  if (/\b(valide mes|qui valide|mon referent|mon cadre|mon responsable|mon manager|mon chef|referent de mon)\b/.test(q)) {
    const cadres = collegues.filter((u) => u.role === "CADRE" && u.pole && u.pole === moi.pole && u.id !== moi.id);
    const employeurs = collegues.filter((u) => u.role === "EMPLOYEUR");
    const parts = [];
    if (cadres.length) parts.push(`le référent de ton pôle (${moi.pole}) : ${cadres.map(nomComplet).join(", ")}`);
    if (employeurs.length) parts.push(`les Employeurs / RH : ${employeurs.map(nomComplet).join(", ")}`);
    return {
      reponse: parts.length ? `Tes demandes peuvent être validées par ${parts.join(", et ")}. Tu es notifié dès qu’une décision est prise.` : "Tes demandes sont traitées par les Employeurs / RH dans « Validation & accès ».",
      navigation: { href: "/mes-demandes", label: "Suivre mes demandes" },
    };
  }
  if (cites.length === 1) {
    const u = cites[0];
    const role = { CADRE: ", référent du pôle", EMPLOYEUR: ", Employeur / RH", COMPTABLE: ", comptable" }[u.role] || "";
    return { reponse: `${nomComplet(u)} fait partie du pôle ${POLES_LIBELLES(u.pole)}${u.service ? ` (service ${u.service})` : ""}${role}.`, navigation: null };
  }
  const pole = collegues.map((u) => u.pole).filter(Boolean).find((p) => q.includes(NORMALISER(p))) || (/\bmon pole|mon equipe\b/.test(q) ? moi.pole : null);
  if (pole) {
    const membres = collegues.filter((u) => u.pole === pole);
    const referents = membres.filter((u) => u.role === "CADRE");
    return {
      reponse: `Le pôle ${pole} compte ${membres.length} personne${membres.length > 1 ? "s" : ""} : ${membres.map(nomComplet).join(", ")}.${referents.length ? ` Référent : ${referents.map(nomComplet).join(", ")}.` : ""}`,
      navigation: { href: `/planning?vue=semaine&pole=${encodeURIComponent(pole)}`, label: `Planning du pôle ${pole}` },
    };
  }
  if (/\b(poles|quels poles|liste des poles)\b/.test(q)) {
    const poles = [...new Set(collegues.map((u) => u.pole).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    return { reponse: `Les pôles de CF Réseaux : ${poles.map((p) => `${p} (${collegues.filter((u) => u.pole === p).length})`).join(", ")}.`, navigation: null };
  }
  return null;
}

// Prochain jour férié (en semaine ou non) à partir d'aujourd'hui.
export function prochainFerie() {
  const aujourdhui = dateFranceISO();
  const annee = Number(aujourdhui.slice(0, 4));
  const tous = [...joursFeries(annee), ...joursFeries(annee + 1)]
    .map((f) => ({ ...f, iso: `${f.date.getFullYear()}-${String(f.date.getMonth() + 1).padStart(2, "0")}-${String(f.date.getDate()).padStart(2, "0")}` }))
    .filter((f) => f.iso >= aujourdhui)
    .sort((a, b) => a.iso.localeCompare(b.iso));
  const f = tous[0];
  if (!f) return null;
  const jours = Math.round((jourUTC(f.iso) - jourUTC(aujourdhui)) / 86400000);
  const weekend = estWeekendISO(f.iso);
  return `Le prochain jour férié est ${f.libelle}, ${dateCourte(f.iso)}${jours === 0 ? " (c’est aujourd’hui !)" : ` (dans ${jours} jour${jours > 1 ? "s" : ""})`}.${weekend ? " Il tombe un week-end, il n’y a donc pas de jour chômé en plus 😕" : " 🎉"}`;
}
