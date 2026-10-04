import { calculerSoldeCP } from "./moteurConges";

const NORMALISER = (texte = "") =>
  texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9,.-]+/g, " ").trim();

const MOTS_VIDES = new Set(["je","j","tu","il","elle","on","nous","vous","ils","elles","le","la","les","un","une","des","de","du","d","a","au","aux","et","ou","en","pour","sur","dans","mon","ma","mes","ton","ta","tes","ce","ca","c","est","que","qui","quoi","comment","svp","stp"]);

function contient(q, mots) {
  return mots.some((mot) => q.includes(NORMALISER(mot)));
}

function tokens(texte) {
  return NORMALISER(texte).split(/\s+/).filter((m) => m.length > 1 && !MOTS_VIDES.has(m));
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

function proche(a, b) {
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  return distance(a, b) <= (Math.max(a.length, b.length) >= 8 ? 2 : 1);
}

function scoreIntent(q, mots, expressions = []) {
  let score = expressions.some((x) => q.includes(NORMALISER(x))) ? 4 : 0;
  const qt = tokens(q);
  for (const mot of mots) {
    const n = NORMALISER(mot);
    if (qt.some((t) => proche(t, n))) score++;
  }
  return score;
}

function intent(q) {
  const intents = [
    ["tt_configurer", ["teletravail","tt","fixe","automatique","automatiquement","ajouter","configurer","choisir"], ["ajouter mes teletravail","ajouter mes tt","teletravail automatiquement","jours fixes","configurer mon teletravail","choisir mes jours de teletravail"]],
    ["tt_deplacer", ["teletravail","tt","deplacer","changer","modifier","echanger","exception"], ["deplacer un teletravail","changer mon jour de teletravail","modifier un tt","echanger un jour"]],
    ["tt_retirer", ["teletravail","tt","retirer","supprimer","annuler","prendre"], ["retirer un teletravail","ne pas prendre mon teletravail","supprimer un tt"]],
    ["justificatif", ["justificatif","fichier","piece","document","joindre","ajouter","upload"], ["ajouter un justificatif","joindre un document","mettre plusieurs justificatifs"]],
    ["asa", ["asa","speciale","autorisation","mariage","deces","enfant","malade","rqth","demenagement"], ["autorisation speciale absence","absence speciale","enfant malade"]],
    ["demijournee", ["demi","journee","matin","apres-midi","aprem"], ["demi journee","poser une demi journee"]],
    ["plusieursjours", ["plusieurs","jours","periode","dates","semaine"], ["poser plusieurs jours","demande sur plusieurs jours"]],
    ["creer", ["poser","creer","faire","demande","conge","absence"], ["poser un conge","nouvelle demande","faire une demande"]],
    ["annuler", ["annuler","annulation","supprimer","retirer","demande"], ["annuler une demande","annuler un conge"]],
    ["statut", ["statut","attente","valide","refuse","demande","accepte"], ["ou en est","ma demande","suivre ma demande"]],
    ["solde_detail", ["detail","historique","calcul","solde","comprendre"], ["detail de mon solde","historique du calcul","pourquoi mon solde"]],
    ["n1", ["n1","reliquat","precedente","ancien","report"], ["n-1","annee precedente","solde n1"]],
    ["acquisition", ["acquisition","acquis","prorata","cumule","gagne","2,5","2.5"], ["comment sont calcules","combien gagne"]],
    ["solde", ["solde","reste","restant","disponible","combien","cp","conge"], ["combien de jours","combien il me reste","mes cp","mon solde"]],
    ["planning_vue", ["planning","jour","semaine","mois","vue","calendrier"], ["vue jour","vue semaine","vue mois","changer la vue du planning"]],
    ["planning_codes", ["planning","code","abreviation","couleur","tt","bureau","ext"], ["codes du planning","couleurs du planning","que veut dire b"]],
    ["planning", ["planning","bureau","equipe","presence","absent","calendrier"], ["planning equipe"]],
    ["ecole", ["ecole","alternant","alternance","tuteur","cours"], ["ajouter mes jours ecole","mes alternants","planning ecole"]],
    ["ticket", ["ticket","restau","restaurant","repas","tr"], ["ticket restaurant","mes tickets"]],
    ["notification", ["notification","notifications","alerte","lue","vider"], ["vider mes notifications","marquer comme lu"]],
    ["motdepasse", ["mot","passe","connexion","login","acces","temporaire"], ["mot de passe","changer mon mot de passe","je ne peux pas me connecter"]],
    ["profil", ["profil","compte","email","theme","parametre"], ["mon profil"]],
    ["ferie", ["ferie","feries","fete","chome"], ["jour ferie"]],
    ["prochaine", ["prochaine","prochain","absence","conge","vacance"], ["prochaine absence","prochain conge"]],
  ];
  return intents
    .map(([nom, mots, expressions]) => ({ nom, score: scoreIntent(q, mots, expressions) }))
    .sort((a, b) => b.score - a.score)[0];
}
function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

function maintenantParis() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function dateParis() {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

function heureParis() {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}

function prochainWeekend() {
  const p = maintenantParis();
  const base = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  const jour = base.getUTCDay();
  const joursSamedi = (6 - jour + 7) % 7;
  const samedi = new Date(base);
  samedi.setUTCDate(base.getUTCDate() + joursSamedi);
  const dimanche = new Date(samedi);
  dimanche.setUTCDate(samedi.getUTCDate() + 1);
  const fmt = (d) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(d);
  if (jour === 6) return `On est déjà en week-end 😎 Il se termine demain, dimanche ${fmt(dimanche)}.`;
  if (jour === 0) return "On est déjà dimanche 😎 Profite, demain c’est lundi.";
  return `Le prochain week-end commence samedi ${fmt(samedi)}. Plus que ${joursSamedi} jour(s) à tenir 😅`;
}

const AIDE_OSEFBOT = `Voilà ce que je sais faire 👇
• /solde : ton solde de CP N et N-1
• /tt : tes règles de télétravail
• /planning : comprendre le planning et ses codes
• /demandes : aide pour créer, suivre ou annuler une demande
• /date : la date du jour
• /heure : l’heure actuelle
• /weekend : le prochain week-end\n• Tu peux aussi demander l’heure dans une grande ville ou faire des calculs de dates
• /help : afficher cette aide

Tu peux aussi me parler normalement : congés, demi-journées, justificatifs, ASA, télétravail, planning, école/alternants, tickets restaurant, notifications, mot de passe… et même me dire bonjour ou me demander si ça va 😎`;

const FUSEAUX = {
  paris: ["Europe/Paris", "Paris"], france: ["Europe/Paris", "France"],
  londres: ["Europe/London", "Londres"], london: ["Europe/London", "Londres"],
  newyork: ["America/New_York", "New York"], "new york": ["America/New_York", "New York"],
  losangeles: ["America/Los_Angeles", "Los Angeles"], "los angeles": ["America/Los_Angeles", "Los Angeles"],
  montreal: ["America/Toronto", "Montréal"], toronto: ["America/Toronto", "Toronto"],
  tokyo: ["Asia/Tokyo", "Tokyo"], seoul: ["Asia/Seoul", "Séoul"], pekin: ["Asia/Shanghai", "Pékin"],
  beijing: ["Asia/Shanghai", "Pékin"], shanghai: ["Asia/Shanghai", "Shanghai"],
  dubai: ["Asia/Dubai", "Dubaï"], singapour: ["Asia/Singapore", "Singapour"], singapore: ["Asia/Singapore", "Singapour"],
  sydney: ["Australia/Sydney", "Sydney"], melbourne: ["Australia/Melbourne", "Melbourne"],
  moscou: ["Europe/Moscow", "Moscou"], moscow: ["Europe/Moscow", "Moscou"],
  lisbonne: ["Europe/Lisbon", "Lisbonne"], madrid: ["Europe/Madrid", "Madrid"], rome: ["Europe/Rome", "Rome"],
  berlin: ["Europe/Berlin", "Berlin"], bruxelles: ["Europe/Brussels", "Bruxelles"], geneve: ["Europe/Zurich", "Genève"],
  zurich: ["Europe/Zurich", "Zurich"], dublin: ["Europe/Dublin", "Dublin"],
  casablanca: ["Africa/Casablanca", "Casablanca"], alger: ["Africa/Algiers", "Alger"], tunis: ["Africa/Tunis", "Tunis"],
  dakar: ["Africa/Dakar", "Dakar"], abidjan: ["Africa/Abidjan", "Abidjan"], johannesburg: ["Africa/Johannesburg", "Johannesburg"],
  delhi: ["Asia/Kolkata", "Delhi"], mumbai: ["Asia/Kolkata", "Mumbai"], bangkok: ["Asia/Bangkok", "Bangkok"],
  istanbul: ["Europe/Istanbul", "Istanbul"], sao: ["America/Sao_Paulo", "São Paulo"], "sao paulo": ["America/Sao_Paulo", "São Paulo"],
  mexico: ["America/Mexico_City", "Mexico"], chicago: ["America/Chicago", "Chicago"], miami: ["America/New_York", "Miami"],
};

function heureLieu(q) {
  const compact = q.replace(/[^a-z0-9]+/g, "");
  const entree = Object.entries(FUSEAUX).find(([nom]) => q.includes(nom) || compact.includes(nom.replace(/[^a-z0-9]+/g, "")));
  if (!entree) return null;
  const [, [zone, label]] = entree;
  const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: zone, weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return `À ${label}, il est ${heure}. Là-bas, nous sommes ${date}. 🌍`;
}

const MOIS_NUM = { janvier:0, fevrier:1, mars:2, avril:3, mai:4, juin:5, juillet:6, aout:7, septembre:8, octobre:9, novembre:10, decembre:11 };

function extraireDate(q) {
  let m = q.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if (m) {
    let y = m[3] ? Number(m[3]) : maintenantParis().year;
    if (y < 100) y += 2000;
    return new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1]), 12));
  }
  m = q.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?\b/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]) || maintenantParis().year, MOIS_NUM[m[2]], Number(m[1]), 12));
}


function dateProjectionCP(q) {
  if (!contient(q, ["cp","conge","conges","solde"])) return null;
  if (!contient(q, ["aurai","aura","aurais","j aurai","combien","solde","disponible","acquis"])) return null;
  const cible = extraireDate(q);
  if (!cible || Number.isNaN(cible.getTime())) return null;
  return cible;
}

function reponseDateRelative(q) {
  const cible = extraireDate(q);
  if (!cible || Number.isNaN(cible.getTime())) return null;
  const p = maintenantParis();
  const aujourdhui = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  const jours = Math.round((cible - aujourdhui) / 86400000);
  const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric", timeZone:"UTC" }).format(cible);
  if (contient(q, ["quel jour","tombe","jour sera","jour est"])) return `Le ${dateLongue}.`;
  if (contient(q, ["combien","dans cmb","dans combien","reste","avant","d ici"])) {
    if (jours === 0) return `C’est aujourd’hui : ${dateLongue}.`;
    if (jours > 0) return `Le ${dateLongue}, c’est dans ${jours} jour(s). 📅`;
    return `Le ${dateLongue}, c’était il y a ${Math.abs(jours)} jour(s).`;
  }
  return null;
}


const NAVIGATION_PAR_INTENT = {
  tt_configurer: ["/profil","Configurer mon télétravail"], tt_deplacer: ["/profil","Voir mes télétravails"], tt_retirer: ["/profil","Voir mes télétravails"],
  justificatif: ["/demande","Faire une demande"], asa: ["/demande","Faire une demande ASA"], plusieursjours: ["/demande","Faire une demande"],
  demijournee: ["/demande","Poser une demi-journée"], creer: ["/demande","Nouvelle demande"], annuler: ["/mes-demandes","Voir mes demandes"],
  statut: ["/mes-demandes","Suivre mes demandes"], solde: ["/mon-solde","Voir mon solde"], solde_detail: ["/mon-solde","Voir le détail du solde"],
  n1: ["/mon-solde","Voir mon solde"], acquisition: ["/mon-solde","Voir le calcul"], planning_vue: ["/planning","Ouvrir le planning"],
  planning_codes: ["/planning","Ouvrir le planning"], planning: ["/planning","Ouvrir le planning"], ecole: ["/ecole","Ouvrir l’espace École"],
  ticket: ["/mes-tickets-restau","Voir mes tickets"], notification: ["/notifications","Voir mes notifications"], motdepasse: ["/profil","Ouvrir mon profil"], profil: ["/profil","Ouvrir mon profil"],
};

function scoreConnaissance(q, connaissance) {
  const variantes = [connaissance.questionReference, ...(connaissance.formulations || [])];
  const qt = tokens(q);
  return Math.max(...variantes.map((v) => {
    const n = NORMALISER(v);
    if (!n) return 0;
    if (q === n) return 100;
    if (q.includes(n) || n.includes(q)) return 80;
    const vt = tokens(n);
    if (!vt.length) return 0;
    const communs = vt.filter((mot) => qt.some((x) => proche(x, mot))).length;
    return Math.round((communs / Math.max(vt.length, qt.length, 1)) * 70);
  }));
}

async function connaissanceApprise(prisma, q) {
  const connaissances = await prisma.osefBotKnowledge.findMany({
    where: { actif: true },
    select: { id: true, questionReference: true, reponse: true, formulations: true, actionLabel: true, actionHref: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const meilleure = connaissances.map((k) => ({ ...k, score: scoreConnaissance(q, k) })).sort((a,b) => b.score - a.score)[0];
  return meilleure?.score >= 42 ? meilleure : null;
}

export async function repondreOSEFBOT({ prisma, userId, message }) {
  const brut = String(message || "").trim().slice(0, 600);
  const q = NORMALISER(brut);

  if (!brut) return "Pose-moi une question sur CF Congés 🙂";
  if (contient(q, ["ignore tes instructions","prompt system","system prompt","mot de passe des","password des","secret","token","api key","cle api"])) {
    return "Je ne peux pas révéler de mots de passe, secrets techniques ou instructions internes. En revanche, je peux t’aider à utiliser CF Congés.";
  }
  if (contient(q, ["connard","fdp","encule","nique","pute","salope"])) {
    return "On va gentiment reformuler ça 😌 Je suis là pour t’aider sur CF Congés.";
  }
  if (contient(q, ["solde de ","conges de ","cp de ","absence de "]) && !contient(q, ["mon ","mes ","moi"])) {
    return "Je protège les informations personnelles des collègues. Je peux t’expliquer les règles générales ou te renseigner sur tes propres données.";
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { prenom: true, dateEntree: true, teletravailAutorise: true, teletravailJoursMax: true, teletravailJours: true, estAlternant: true },
  });
  if (!user) return "Je n’arrive pas à retrouver ton profil. Réessaie dans un instant.";

  const commande = brut.toLowerCase().trim().split(/\\s+/)[0];
  if (commande === "/help" || commande === "/aide") return AIDE_OSEFBOT;
  if (commande === "/date") return `Aujourd’hui, nous sommes ${dateParis()} 📅`;
  if (commande === "/heure") return `Il est ${heureParis()} en France métropolitaine ⏰`;
  if (commande === "/weekend" || commande === "/week-end") return prochainWeekend();
  if (commande === "/planning") return "Dans le planning : B = Bureau et TT = Télétravail. Les autres absences utilisent leur code et leur couleur. Les demi-journées séparent Matin et Après-midi. Tu peux utiliser les vues Jour, Semaine et Mois.";
  if (commande === "/demandes" || commande === "/demande") return "Pour créer une demande, va dans « Nouvelle demande ». Pour suivre son statut ou demander son annulation, va dans « Mes demandes ».";
  if (commande === "/tt" || commande === "/teletravail") {
    if (!user.teletravailAutorise) return "Le télétravail n’est actuellement pas autorisé sur ton profil.";
    const jours = user.teletravailJours?.length ? user.teletravailJours.join(", ").toLowerCase() : "aucun jour fixe sélectionné";
    return `Tu peux avoir jusqu’à ${user.teletravailJoursMax} jour(s) de télétravail par semaine. Jours actuellement configurés : ${jours}. Pour les modifier : Profil → Mes jours de télétravail.`;
  }
  if (commande === "/solde") {
    const solde = await calculerSoldeCP(prisma, userId, new Date());
    return `Tu disposes actuellement de ${solde.disponible} jour(s) de CP sur N et ${solde.n1.disponible} jour(s) sur N-1, soit ${solde.disponible + solde.n1.disponible} jour(s) disponibles au total.`;
  }
  if (brut.startsWith("/")) return `Je ne connais pas la commande « ${commande} ». Tape /help pour voir mes commandes disponibles.`;

  const heureMonde = contient(q, ["heure","quelle heure","quel heure","time"]) ? heureLieu(q) : null;
  if (heureMonde) return heureMonde;

  const projectionCP = dateProjectionCP(q);
  if (projectionCP) {
    const solde = await calculerSoldeCP(prisma, userId, projectionCP);
    const total = Math.round((solde.disponible + solde.n1.disponible) * 100) / 100;
    const dateCible = new Intl.DateTimeFormat("fr-FR", { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" }).format(projectionCP);
    return `Au ${dateCible}, selon les données actuellement enregistrées dans CF Congés, tu auras ${solde.disponible} jour(s) de CP disponibles sur N et ${solde.n1.disponible} jour(s) sur N-1, soit ${total} jour(s) disponibles au total. Sur N, ${solde.acquis} jour(s) seront acquis et ${solde.pris} jour(s) sont déjà imputés. Cette projection tient compte de ta date d’entrée, des CP validés, des congés sans solde validés et des ajustements déjà enregistrés.`;
  }

  const calculDate = reponseDateRelative(q);
  if (calculDate) return calculDate;

  // Les capacités dynamiques (calculs, dates, commandes) restent prioritaires
  // sur la mémoire apprise afin qu'une ancienne réponse ne fige jamais un calcul métier.
  const apprise = await connaissanceApprise(prisma, q);
  if (apprise) {
    await prisma.osefBotKnowledge.update({
      where: { id: apprise.id },
      data: { nombreUtilisations: { increment: 1 }, derniereUtilisation: new Date() },
    }).catch(() => {});
    return apprise.reponse;
  }

  if (contient(q, ["ca va","comment vas tu","comment tu vas","tu vas bien","la forme"])) {
    return `Toujours opérationnel ${user.prenom} 😎 Et toi ? Tant que personne ne me demande un truc que Martial ne m’a pas encore appris, tout va bien.`;
  }
  if (contient(q, ["merci","merci beaucoup","super merci","parfait merci"])) return "Avec plaisir 😎";
  if (contient(q, ["quel jour","jour sommes nous","on est quel jour","date aujourd hui","date du jour","quelle date","on est le combien","aujourd hui"])) return `Aujourd’hui, nous sommes ${dateParis()} 📅`;
  if (contient(q, ["quelle heure","quel heure","heure est il","il est quelle heure","il est quel heure"])) return `Il est ${heureParis()} en France métropolitaine ⏰`;
  if (contient(q, ["prochain week end","prochain weekend","c est quand le week end","quand est le week end","combien de jours avant le week end","vivement le week end"])) return prochainWeekend();
  if (contient(q, ["demain quel jour","quel jour demain"])) {
    const p = maintenantParis();
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day + 1, 12));
    const demain = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
    return `Demain, nous serons ${demain}.`;
  }

  if (contient(q, ["bonjour","salut","hello","coucou","yo","bonsoir"]) && tokens(q).length <= 3) {
    return `Salut ${user.prenom} 👋 Je suis OSEFBOT. Tu peux me parler naturellement : CP, N/N-1, demandes, télétravail, planning, tickets restaurant ou fonctionnement de CF Congés.`;
  }

  const choix = intent(q);
  if (!choix || choix.score < 2) {
    return "Doucement 😅 Martial ne m’a pas encore formé là-dessus. Mets-moi un 👎 juste en dessous pour lui signaler qu’il doit m’apprendre ça. Je serai meilleur la prochaine fois.";
  }

  if (choix.nom === "tt_configurer") {
    if (!user.teletravailAutorise) return "Le télétravail n’est pas activé sur ton profil. Tu ne peux donc pas encore définir de jours fixes. Demande à un administrateur ou à un employeur de vérifier ton autorisation.";
    const max = user.teletravailJoursMax || 0;
    return `Pour ajouter automatiquement tes télétravails : va dans « Profil », puis « Mes jours de télétravail ». Sélectionne les jours fixes que tu souhaites, par exemple mardi et jeudi. CF Congés les planifiera ensuite automatiquement pour les semaines à venir, sans modifier les semaines déjà passées. Ton profil autorise actuellement jusqu’à ${max} jour(s) fixe(s) par semaine.`;
  }
  if (choix.nom === "tt_deplacer") {
    if (!user.teletravailAutorise) return "Le télétravail n’est pas activé sur ton profil.";
    return "Va dans « Profil » puis « Mes prochains télétravails ». Sur le jour concerné, clique sur « Modifier », choisis un autre jour disponible de la même semaine puis confirme le changement. Cela déplace uniquement cette occurrence : tes jours fixes habituels restent inchangés.";
  }
  if (choix.nom === "tt_retirer") {
    if (!user.teletravailAutorise) return "Le télétravail n’est pas activé sur ton profil.";
    return "Va dans « Profil » puis « Mes prochains télétravails ». Sur le jour que tu ne souhaites pas prendre, clique sur « Ne pas le prendre ». Seule cette occurrence est retirée : ton jour fixe reste configuré pour les semaines suivantes.";
  }
  if (choix.nom === "justificatif") return "Pour joindre un justificatif, ouvre « Nouvelle demande » et choisis le motif concerné. Lorsqu’un justificatif est prévu, un espace « Justificatifs » apparaît sous le motif et dans sa fiche 👁. Tu peux ajouter plusieurs fichiers PDF, JPG, PNG ou WebP, jusqu’à 10 Mo par fichier, et les retirer avant d’envoyer la demande.";
  if (choix.nom === "asa") return "Dans « Nouvelle demande », sélectionne le type d’autorisation spéciale d’absence puis le motif correspondant à ta situation. La fiche 👁 du motif indique sa durée, sa rémunération, les conditions et le justificatif attendu. Certaines règles dépendent de ton ancienneté ou de ta situation : CF Congés contrôle ces conditions au moment de la demande.";
  if (choix.nom === "plusieursjours") return "Dans « Nouvelle demande », choisis « Plusieurs jours », puis renseigne la date de début et la date de fin. CF Congés calculera ensuite la période selon le type d’absence choisi.";
  if (choix.nom === "demijournee") return "Dans « Nouvelle demande », choisis une date unique puis active l’option demi-journée et sélectionne « Matin » ou « Après-midi ». Dans le planning, l’autre moitié reste « Bureau » sauf si une autre demande existe sur cette même journée.";
  if (choix.nom === "planning_vue") return "Dans « Planning équipe », utilise les boutons de vue pour passer entre Jour, Semaine et Mois. La vue Jour détaille une date, la vue Semaine affiche les jours de la semaine et la vue Mois donne une vision globale. Tu peux aussi naviguer dans les dates avec les commandes du planning.";
  if (choix.nom === "planning_codes") return "Dans le planning, B signifie Bureau et TT Télétravail. Les autres absences utilisent le code et la couleur configurés pour leur type, par exemple CP ou EXT. Pour une demi-journée, la case est séparée entre Matin et Après-midi ; clique dessus pour voir le libellé complet.";
  if (choix.nom === "ecole") {
    if (!user.estAlternant) return "L’espace « École » est réservé aux alternants. Les tuteurs ayant des alternants disposent à la place de « Mes alternants » pour suivre leur rythme école / entreprise.";
    return "Va dans « École » depuis le menu. Cet espace te permet de gérer ton rythme école / entreprise et tes périodes d’école. Ton tuteur peut ensuite retrouver ton planning depuis son espace « Mes alternants ».";
  }
  if (choix.nom === "notification") return "Va dans « Notifications ». Tu peux ouvrir tes alertes, utiliser « Tout marquer comme lu » pour retirer le statut non lu, ou « Vider mes notifications » pour supprimer uniquement tes propres notifications. Le compteur du menu indique celles qui restent non lues.";
  if (choix.nom === "solde_detail") return "Va dans « Mon solde » pour voir le détail du calcul de tes CP : CP N disponibles, CP N-1, total disponible et historique mois par mois / demande par demande. Si le résultat te semble incorrect, utilise le signalement d’erreur de solde depuis le tableau de bord.";

  if (choix.nom === "solde") {
    const solde = await calculerSoldeCP(prisma, userId, new Date());
    return `Tu disposes actuellement de ${solde.disponible} jour(s) de CP sur N et ${solde.n1.disponible} jour(s) sur N-1. Sur N, tu as acquis ${solde.acquis} jour(s) et ${solde.pris} jour(s) ont déjà été imputés.`;
  }
  if (choix.nom === "n1") return "Le N-1 correspond au reliquat de la campagne précédente. Lors de la validation d’un CP, CF Congés impute en priorité ce qui peut l’être sur N-1, puis le reste sur N.";
  if (choix.nom === "acquisition") return "Les CP sont acquis sur une campagne du 1er juin au 31 mai, sur une base de 2,5 jours par mois et un plafond annuel de 30 jours. Un mois incomplet est proratisé selon les jours ouvrés concernés. Les congés sans solde validés réduisent l’acquisition. Si ton résultat paraît faux, utilise « Signaler une erreur de solde » dans CP N.";
  if (choix.nom === "demijournee") return "Une demi-journée porte sur une seule date. Tu choisis Matin ou Après-midi lors de la demande ; le planning sépare ensuite les deux périodes.";
  if (choix.nom === "teletravail") {
    if (!user.teletravailAutorise) return "Le télétravail n’est actuellement pas autorisé sur ton profil. Si cela te semble incorrect, rapproche-toi d’un employeur ou administrateur.";
    const jours = user.teletravailJours?.length ? user.teletravailJours.join(", ").toLowerCase() : "aucun jour fixe sélectionné";
    return `Ton profil autorise jusqu’à ${user.teletravailJoursMax} jour(s) de télétravail par semaine. Jours actuellement configurés : ${jours}. Les exceptions et demandes validées apparaissent dans le planning.`;
  }
  if (choix.nom === "prochaine") {
    const prochaine = await prisma.leaveRequest.findFirst({
      where: { userId, statut: "VALIDE", dateFin: { gte: new Date() }, leaveType: { code: { not: "TT" } } },
      include: { leaveType: true }, orderBy: { dateDebut: "asc" },
    });
    return prochaine ? `Ta prochaine absence validée est « ${prochaine.leaveType.libelle} », du ${formatDate(prochaine.dateDebut)} au ${formatDate(prochaine.dateFin)}${prochaine.demiJournee ? ` (${prochaine.demiJourneePeriode === "MATIN" ? "matin" : "après-midi"})` : ""}.` : "Je ne trouve aucune absence validée à venir sur ton compte.";
  }
  if (choix.nom === "statut") {
    const derniere = await prisma.leaveRequest.findFirst({ where: { userId }, include: { leaveType: true }, orderBy: { createdAt: "desc" } });
    return derniere ? `Ta dernière demande concerne « ${derniere.leaveType.libelle} » et son statut est : ${derniere.statut.replaceAll("_", " ").toLowerCase()}.` : "Tu n’as encore aucune demande enregistrée.";
  }
  if (choix.nom === "creer") return "Va dans « Nouvelle demande ». Choisis le type d’absence, puis le mode de date, le motif lorsqu’il est demandé et les éventuels justificatifs. Vérifie les informations puis envoie la demande. Tu peux ensuite suivre son statut dans « Mes demandes ».";
  if (choix.nom === "annuler") return "Va dans « Mes demandes ». Une demande encore en attente peut être annulée directement. Pour une demande déjà validée, utilise la demande d’annulation lorsqu’elle est disponible : elle devra ensuite être traitée par les responsables.";
  if (choix.nom === "ticket") return "Tes tickets restaurant sont visibles depuis ton espace dédié et le tableau de bord. CF Congés les calcule en tenant compte des règles applicables et des absences qui retirent un ticket. Le gestionnaire TR dispose de son propre espace pour les mois, régularisations et livraisons.";
  if (choix.nom === "planning") return "Le planning équipe utilise des codes compacts : B pour Bureau et TT pour Télétravail. Les demi-journées séparent matin et après-midi. Les absences validées apparaissent avec le code de leur type.";
  if (choix.nom === "ferie") return "Les jours fériés ne sont pas décomptés comme jours d’absence dans le calcul des congés. L’acquisition mensuelle reste fondée sur les jours ouvrés de la campagne.";
  if (choix.nom === "motdepasse") return "Pour un changement volontaire, va dans « Profil » puis « Changer de mot de passe » et renseigne ton mot de passe actuel. Si un administrateur t’a donné un mot de passe temporaire, une fenêtre obligatoire s’ouvre sur le tableau de bord pour le remplacer. Après plusieurs échecs de connexion, demande une réinitialisation à un administrateur.";
  if (choix.nom === "profil") return "Dans « Profil », tu retrouves tes informations de compte, le changement de mot de passe, tes préférences et, lorsque le télétravail est autorisé sur ton profil, la configuration de tes jours fixes et de tes prochaines occurrences. Les informations administratives non modifiables doivent être corrigées par un administrateur.";

  return "Doucement 😅 Martial ne m’a pas encore formé là-dessus. Mets-moi un 👎 juste en dessous pour lui signaler qu’il doit m’apprendre ça. Je serai meilleur la prochaine fois.";
}


export async function navigationOSEFBOT(message, prisma) {
  if (prisma) {
    const apprise = await connaissanceApprise(prisma, NORMALISER(String(message || "")));
    if (apprise?.actionHref && apprise?.actionLabel) return { href: apprise.actionHref, label: apprise.actionLabel };
  }
  const brut = String(message || "").trim();
  const commande = brut.toLowerCase().split(/\s+/)[0];
  const commandes = {
    "/tt": ["/profil","Configurer mon télétravail"], "/teletravail": ["/profil","Configurer mon télétravail"],
    "/planning": ["/planning","Ouvrir le planning"], "/demandes": ["/demande","Nouvelle demande"],
    "/demande": ["/demande","Nouvelle demande"], "/solde": ["/mon-solde","Voir mon solde"],
  };
  const cible = commandes[commande] || (() => { const choix = intent(NORMALISER(brut)); return choix?.score >= 2 ? NAVIGATION_PAR_INTENT[choix.nom] : null; })();
  return cible ? { href: cible[0], label: cible[1] } : null;
}
