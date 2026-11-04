// MatthiasBot : « C'est quoi le 1er juillet ? », « Il se passe quoi le
// 14/02 ? »… Tout ce qui tombe à une date : jours fériés, jours particuliers,
// dates de CF Réseaux, anniversaires et anniversaires d'entrée des collègues,
// et ce que dit le planning ce jour-là.
import { dateFranceISO } from "./dateFrance";
import { joursFeries } from "./joursFeries";
import { estAnniversaireLe, jourMoisNaissance } from "./anniversaires";
import { chargerCollegues, presences, phraseJournee, nomComplet } from "./matthiasbotEquipe";
import { categorieJournee } from "./etatJournee";

const NORMALISER = (texte = "") =>
  texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").replace(/([a-z])-([a-z])/g, "$1 $2").replace(/[^a-z0-9/.-]+/g, " ").trim();

const MOIS = { janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11 };
const CREATION_CF = "2021-07-01"; // création de CF Réseaux

const jourUTC = (iso) => new Date(`${iso}T12:00:00Z`);
const isoDe = (d) => d.toISOString().slice(0, 10);
const isoYMD = (y, m, d) => isoDe(new Date(Date.UTC(y, m, d, 12)));
const ajouter = (iso, n) => {
  const d = jourUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDe(d);
};
const ecartJours = (a, b) => Math.round((jourUTC(b) - jourUTC(a)) / 86400000);
// « 1 juillet » -> « 1er juillet ».
const premier = (texte) => texte.replace(/\b1 (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/, "1er $1");
const dateLongue = (iso) => premier(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(jourUTC(iso)));
const jourMois = (iso) => premier(new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(jourUTC(iso)));

// ---------- Lecture de la date dans la question ----------

// Renvoie { iso, anneeDonnee } ou null. Sans année : la prochaine occurrence
// (aujourd'hui compris).
export function dateDeLaQuestion(q, aujourdhui = dateFranceISO()) {
  if (/\baujourd hui\b/.test(q)) return { iso: aujourdhui, anneeDonnee: true };
  if (/\bapres[- ]?demain\b/.test(q)) return { iso: ajouter(aujourdhui, 2), anneeDonnee: true };
  if (/\bdemain\b/.test(q)) return { iso: ajouter(aujourdhui, 1), anneeDonnee: true };
  if (/\bhier\b/.test(q)) return { iso: ajouter(aujourdhui, -1), anneeDonnee: true };
  const anneeCourante = Number(aujourdhui.slice(0, 4));
  let jour, mois, annee;
  let m = q.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (m) [jour, mois, annee] = [Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : null];
  if (!m) {
    m = q.match(/\b(\d{1,2}|1er|premier)\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?\b/);
    if (m) [jour, mois, annee] = [m[1] === "1er" || m[1] === "premier" ? 1 : Number(m[1]), MOIS[m[2]], m[3] ? Number(m[3]) : null];
  }
  if (!m || mois < 0 || mois > 11 || jour < 1 || jour > 31) return null;
  if (annee !== null && annee < 100) annee += 2000;
  if (annee === null) {
    annee = anneeCourante;
    if (isoYMD(annee, mois, jour) < aujourdhui) annee += 1;
  }
  const iso = isoYMD(annee, mois, jour);
  if (Number(iso.slice(8, 10)) !== jour) return null; // ex. 31/02
  return { iso, anneeDonnee: m[3] !== undefined && m[3] !== null };
}

// La question porte-t-elle sur « ce qu'il y a » à une date ?
export function questionSurUneDate(q) {
  if (!dateDeLaQuestion(q)) return false;
  if (/\b(c est quoi|c etait quoi|que se passe|qu est ce qui se passe|il se passe quoi|il y a quoi|y a quoi|ya quoi|quoi de special|quoi de prevu|qu y a t il|qu est ce qu il y a|evenement|evenements|on fete|que fete|qu est ce qu on fete|on fete quoi|jour special|jour particulier|c est quel jour|pourquoi le|special le|programme)\b/.test(q)) return true;
  // Question réduite à la date : « 1er juillet ? », « le 14/02 ».
  return /^(le |la date du )?(\d{1,2}|1er|premier)[\s/.-][a-z0-9/.-]*( \d{4})?$/.test(q.trim());
}

// ---------- Jours particuliers ----------

function paques(annee) {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return isoYMD(annee, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
// n-ième dimanche du mois (n = -1 : le dernier).
function dimanche(annee, mois, n) {
  if (n === -1) {
    const fin = jourUTC(isoYMD(annee, mois + 1, 0));
    return ajouter(isoDe(fin), -fin.getUTCDay());
  }
  const premier = jourUTC(isoYMD(annee, mois, 1));
  return ajouter(isoDe(premier), ((7 - premier.getUTCDay()) % 7) + (n - 1) * 7);
}

const FIXES = {
  "01-06": "l’Épiphanie : galette des rois au programme 👑",
  "02-02": "la Chandeleur 🥞",
  "02-14": "la Saint-Valentin 💘",
  "03-08": "la journée internationale des droits des femmes 💜",
  "03-14": "le Pi Day (3,14) 🥧",
  "03-17": "la Saint-Patrick 🍀",
  "04-01": "le 1er avril : attention aux poissons dans le dos 🐟",
  "05-04": "le Star Wars Day : May the 4th be with you ✨",
  "06-21": "la fête de la musique et le début de l’été 🎶☀️",
  "10-01": "la journée mondiale du café ☕",
  "10-31": "Halloween 🎃",
  "12-24": "le réveillon de Noël 🎄",
  "12-31": "la Saint-Sylvestre, dernier jour de l’année 🥂",
};

function joursParticuliers(iso) {
  const annee = Number(iso.slice(0, 4));
  const md = iso.slice(5);
  const liste = [];
  const ferie = joursFeries(annee).find((f) => isoDe(new Date(Date.UTC(f.date.getFullYear(), f.date.getMonth(), f.date.getDate(), 12))) === iso);
  if (ferie) liste.push(`📅 ${ferie.libelle}, jour férié${[0, 6].includes(jourUTC(iso).getUTCDay()) ? " (il tombe un week-end, donc pas de jour off en plus 😕)" : " : pas de travail ce jour-là, sauf férié travaillé validé 🎉"}`);
  if (FIXES[md]) liste.push(`🎈 C’est ${FIXES[md]}`);
  const p = paques(annee);
  if (iso === p) liste.push("🐣 C’est le dimanche de Pâques");
  if (iso === ajouter(p, -47)) liste.push("🎭 C’est Mardi gras");
  if (iso === ajouter(p, 49)) liste.push("🕊️ C’est le dimanche de Pentecôte");
  const pentecote = ajouter(p, 49);
  const meres = dimanche(annee, 4, -1) === pentecote ? dimanche(annee, 5, 1) : dimanche(annee, 4, -1);
  if (iso === meres) liste.push("💐 C’est la fête des mères");
  if (iso === dimanche(annee, 5, 3)) liste.push("👔 C’est la fête des pères");
  if (iso === dimanche(annee, 2, -1)) liste.push("⏰ Passage à l’heure d’été cette nuit (on perd une heure)");
  if (iso === dimanche(annee, 9, -1)) liste.push("⏰ Passage à l’heure d’hiver cette nuit (une heure de sommeil en plus)");
  const novembre = jourUTC(isoYMD(annee, 10, 1)).getUTCDay();
  if (iso === isoYMD(annee, 10, 1 + ((4 - novembre + 7) % 7) + 22)) liste.push("🛍️ C’est le Black Friday");
  if (md === "02-29") liste.push("🦄 Un 29 février, ça n’arrive qu’une fois tous les 4 ans");
  if (jourUTC(iso).getUTCDay() === 5 && md.endsWith("-13")) liste.push("🍀 Vendredi 13 : jour de chance… ou pas");
  return liste;
}

// Dates propres à CF Réseaux.
function datesCF(iso) {
  const annee = Number(iso.slice(0, 4));
  const md = iso.slice(5);
  const liste = [];
  if (md === "07-01" && iso >= CREATION_CF) {
    const ans = annee - 2021;
    liste.push(ans === 0 ? "🏢 C’est le jour de la création de CF Réseaux (1er juillet 2021) !" : `🎂 C’est l’anniversaire de CF Réseaux : ${ans} an${ans > 1 ? "s" : ""} (créée le 1er juillet 2021) 🥳`);
  }
  if (md === "06-01") liste.push("🗓️ Début de la nouvelle campagne de congés : les CP acquis basculent en N-1, un nouveau compteur N démarre");
  if (md === "05-31") liste.push("🗓️ Dernier jour de la campagne de congés : le total acquis est arrondi au nombre entier supérieur");
  return liste;
}

// ---------- Événements nommés (« c'est quand la fête des mères ? ») ----------

const EVENEMENTS = [
  { noms: ["fete des meres"], libelle: "La fête des mères", emoji: "💐", date: (a) => (dimanche(a, 4, -1) === ajouter(paques(a), 49) ? dimanche(a, 5, 1) : dimanche(a, 4, -1)) },
  { noms: ["fete des peres"], libelle: "La fête des pères", emoji: "👔", date: (a) => dimanche(a, 5, 3) },
  { noms: ["paques", "dimanche de paques"], libelle: "Pâques", emoji: "🐣", date: (a) => paques(a) },
  { noms: ["lundi de paques"], libelle: "Le lundi de Pâques (férié)", emoji: "🐣", date: (a) => ajouter(paques(a), 1) },
  { noms: ["ascension"], libelle: "L’Ascension (férié)", emoji: "☁️", date: (a) => ajouter(paques(a), 39) },
  { noms: ["pentecote", "lundi de pentecote"], libelle: "Le lundi de Pentecôte (férié)", emoji: "🕊️", date: (a) => ajouter(paques(a), 50) },
  { noms: ["mardi gras", "carnaval"], libelle: "Mardi gras", emoji: "🎭", date: (a) => ajouter(paques(a), -47) },
  { noms: ["black friday"], libelle: "Le Black Friday", emoji: "🛍️", date: (a) => isoYMD(a, 10, 1 + ((4 - jourUTC(isoYMD(a, 10, 1)).getUTCDay() + 7) % 7) + 22) },
  { noms: ["heure d ete", "passage a l heure d ete"], libelle: "Le passage à l’heure d’été", emoji: "⏰", date: (a) => dimanche(a, 2, -1) },
  { noms: ["heure d hiver", "passage a l heure d hiver"], libelle: "Le passage à l’heure d’hiver", emoji: "⏰", date: (a) => dimanche(a, 9, -1) },
  {
    noms: ["changement d heure", "changement heure"],
    libelle: "Le prochain changement d’heure",
    emoji: "⏰",
    // Le plus proche des deux (été ou hiver), aujourd'hui compris.
    date: (a, aujourdhui) => [dimanche(a, 2, -1), dimanche(a, 9, -1), dimanche(a + 1, 2, -1)].find((d) => d >= aujourdhui),
  },
  { noms: ["saint valentin"], libelle: "La Saint-Valentin", emoji: "💘", date: (a) => isoYMD(a, 1, 14) },
  { noms: ["chandeleur"], libelle: "La Chandeleur", emoji: "🥞", date: (a) => isoYMD(a, 1, 2) },
  { noms: ["epiphanie", "galette des rois"], libelle: "L’Épiphanie", emoji: "👑", date: (a) => isoYMD(a, 0, 6) },
  { noms: ["halloween"], libelle: "Halloween", emoji: "🎃", date: (a) => isoYMD(a, 9, 31) },
  { noms: ["fete de la musique"], libelle: "La fête de la musique", emoji: "🎶", date: (a) => isoYMD(a, 5, 21) },
  { noms: ["poisson d avril"], libelle: "Le poisson d’avril", emoji: "🐟", date: (a) => isoYMD(a, 3, 1) },
  { noms: ["noel"], libelle: "Noël (férié)", emoji: "🎄", date: (a) => isoYMD(a, 11, 25) },
  { noms: ["reveillon", "nouvel an", "saint sylvestre"], libelle: "Le réveillon du Nouvel An", emoji: "🥂", date: (a) => isoYMD(a, 11, 31) },
  { noms: ["jour de l an"], libelle: "Le jour de l’an (férié)", emoji: "🎆", date: (a) => isoYMD(a, 0, 1) },
  { noms: ["fete du travail"], libelle: "La fête du Travail (férié)", emoji: "🌼", date: (a) => isoYMD(a, 4, 1) },
  { noms: ["victoire 1945"], libelle: "La Victoire 1945 (férié)", emoji: "🇫🇷", date: (a) => isoYMD(a, 4, 8) },
  { noms: ["fete nationale"], libelle: "La fête nationale (férié)", emoji: "🎇", date: (a) => isoYMD(a, 6, 14) },
  { noms: ["assomption"], libelle: "L’Assomption (férié)", emoji: "☀️", date: (a) => isoYMD(a, 7, 15) },
  { noms: ["toussaint"], libelle: "La Toussaint (férié)", emoji: "🍂", date: (a) => isoYMD(a, 10, 1) },
  { noms: ["armistice"], libelle: "L’Armistice (férié)", emoji: "🕊️", date: (a) => isoYMD(a, 10, 11) },
  { noms: ["debut de campagne", "nouvelle campagne"], libelle: "Le début de la nouvelle campagne de congés", emoji: "🗓️", date: (a) => isoYMD(a, 5, 1) },
  { noms: ["fin de campagne", "fin de la campagne"], libelle: "La fin de la campagne de congés", emoji: "🗓️", date: (a) => isoYMD(a, 4, 31) },
];

export function evenementNomme(brut) {
  const q = ` ${NORMALISER(brut)} `;
  if (!/\b(quand|quelle date|c est quoi|quel jour|date de|date du|dans combien|tombe)\b/.test(q)) return null;
  const ev = EVENEMENTS.find((e) => e.noms.some((n) => q.includes(` ${n} `)));
  if (!ev) return null;
  const aujourdhui = dateFranceISO();
  const annee = Number(aujourdhui.slice(0, 4));
  const iso = ev.date(annee, aujourdhui) >= aujourdhui ? ev.date(annee, aujourdhui) : ev.date(annee + 1, aujourdhui);
  const dans = ecartJours(aujourdhui, iso);
  return `${ev.libelle} ${dans === 0 ? "c’est aujourd’hui" : `tombe le ${dateLongue(iso)}, dans ${dans} jour${dans > 1 ? "s" : ""}`} ${ev.emoji}`;
}

// ---------- Réponse ----------

export async function repondreDate({ prisma, q: brut, moi }) {
  const q = NORMALISER(brut);
  if (!questionSurUneDate(q)) return null;
  const aujourdhui = dateFranceISO();
  const { iso } = dateDeLaQuestion(q, aujourdhui);
  const lignes = [...datesCF(iso), ...joursParticuliers(iso)];

  // Anniversaires et anniversaires d'entrée des collègues (jour et mois
  // seulement : jamais l'année de naissance ni l'âge).
  const collegues = await chargerCollegues(prisma);
  const annee = Number(iso.slice(0, 4));
  const anniv = collegues.filter((u) => estAnniversaireLe(u.dateNaissance, iso));
  if (anniv.length) {
    const moiAussi = anniv.some((u) => u.id === moi.id);
    const autres = anniv.filter((u) => u.id !== moi.id);
    if (moiAussi) lignes.push("🎂 C’est TON anniversaire ! Joyeux anniversaire en avance 🎉");
    if (autres.length) lignes.push(`🎂 Anniversaire de ${autres.map(nomComplet).join(", ")}`);
  }
  for (const u of collegues) {
    if (!u.dateEntree) continue;
    const entree = dateFranceISO(new Date(u.dateEntree));
    if (entree === iso) {
      lignes.push(u.id === moi.id ? "👋 C’est ton premier jour chez CF Réseaux !" : `👋 Premier jour de ${nomComplet(u)} chez CF Réseaux`);
    } else if (entree.slice(5) === iso.slice(5) && entree < iso) {
      const ans = annee - Number(entree.slice(0, 4));
      lignes.push(u.id === moi.id ? `🏅 Tu fêtes tes ${ans} an${ans > 1 ? "s" : ""} chez CF Réseaux !` : `🏅 ${nomComplet(u)} fête ses ${ans} an${ans > 1 ? "s" : ""} chez CF Réseaux`);
    }
  }

  // Ce que dit le planning (jusqu'à 1 an avant / après).
  const ecart = ecartJours(aujourdhui, iso);
  if (Math.abs(ecart) <= 366) {
    const etat = await presences(prisma, collegues, iso, iso, { avecFormations: Math.abs(ecart) <= 60 });
    const weekend = [0, 6].includes(jourUTC(iso).getUTCDay());
    const moiDansListe = collegues.find((u) => u.id === moi.id);
    if (weekend) lignes.push("😎 C’est un week-end");
    else {
      if (moiDansListe && moi.role !== "EMPLOYEUR") {
        const e = etat(moiDansListe, iso);
        if (e && !e.weekend) lignes.push(`🧑‍💻 De ton côté : ${ecart < 0 ? "tu étais" : ecart === 0 ? "tu es" : "tu seras"} ${phraseJournee(e)}`);
      }
      const absents = collegues.filter((u) => {
        const e = etat(u, iso);
        return e && !e.weekend && categorieJournee(e.matin, e.aprem) === "absent";
      });
      if (absents.length) lignes.push(`📋 Au planning : ${absents.length} absent${absents.length > 1 ? "s" : ""} (${absents.slice(0, 6).map(nomComplet).join(", ")}${absents.length > 6 ? "…" : ""})`);
    }
  }

  const quand = ecart === 0 ? "Aujourd’hui" : ecart === 1 ? "Demain" : ecart === -1 ? "Hier" : `Le ${dateLongue(iso)}`;
  const delai = ecart > 1 ? ` (dans ${ecart} jours)` : ecart < -1 ? ` (il y a ${-ecart} jours)` : "";
  const titre = ecart === 0 || Math.abs(ecart) === 1 ? `${quand}, ${dateLongue(iso)}` : `${quand}${delai}`;
  const navigation = Math.abs(ecart) <= 366 ? { href: `/planning?vue=jour&jour=${iso}`, label: "Voir le planning de ce jour" } : null;
  if (!lignes.length) {
    return { reponse: `${titre} : rien de spécial à signaler, une journée normale 🙂`, navigation };
  }
  return { reponse: `${titre} :\n${lignes.map((l) => `• ${l}`).join("\n")}`, navigation };
}

// « C'est quand l'anniversaire de CF Réseaux ? », « CF Réseaux a quel âge ? »
export function anniversaireCF(brut) {
  const q = NORMALISER(brut);
  const entreprise = "(cf reseaux|cf reseau|cf|l entreprise|la boite|la societe)";
  const motifs = [
    `anniversaire (de |d )?${entreprise}`,
    `${entreprise} a quel age`,
    `quel age a ${entreprise}`,
    `${entreprise} (a ete |est )?(creee|cree|fondee|nee) quand`,
    `quand (a ete |est )?(creee|cree|fondee) ${entreprise}`,
    `(creation|date de creation|fondation) (de |d )?${entreprise}`,
    `${entreprise} existe depuis`,
    `depuis quand ${entreprise} existe`,
  ];
  if (!motifs.some((m) => new RegExp(`\\b${m}\\b`).test(q))) return null;
  const aujourdhui = dateFranceISO();
  const annee = Number(aujourdhui.slice(0, 4));
  const ans = annee - 2021 - (aujourdhui.slice(5) < "07-01" ? 1 : 0);
  const prochain = aujourdhui.slice(5) <= "07-01" ? `${annee}-07-01` : `${annee + 1}-07-01`;
  const dans = ecartJours(aujourdhui, prochain);
  return `CF Réseaux a été créée le 1er juillet 2021 : ${ans} an${ans > 1 ? "s" : ""} d’existence 🏢 ${dans === 0 ? "Et c’est aujourd’hui son anniversaire 🥳" : `Prochain anniversaire (${annee + (prochain.startsWith(String(annee)) ? 0 : 1) - 2021} ans) le 1er juillet, dans ${dans} jours 🎂`}`;
}

export { jourMois, jourMoisNaissance };
