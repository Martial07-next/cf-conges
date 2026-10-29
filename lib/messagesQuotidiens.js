export const MESSAGES_QUOTIDIENS = [
  "8h30. Le café est chargé, la quête principale peut commencer. ☕🎮",
  "Aujourd'hui, objectif simple : faire mieux que le Wi-Fi de la salle de réunion. 📶",
  "Le conseil s'est réuni : vous êtes officiellement attendus pour carry la journée. 🏆",
  "Mode Ligue des Champions activé. Pas de match retour, alors on joue la journée à fond. ⚽",
  "C'est lundi ? On appelle ça le tutoriel. La vraie partie commence maintenant. 🎮",
  "Plot twist : cette réunion aurait peut-être pu être un mail. Bonne journée quand même. 😌",
  "Votre mission, si vous l'acceptez : arriver à 16h avec encore 12 % de batterie sociale. 🔋",
  "Le café a utilisé Attaque Rapide. C'est super efficace. ☕⚡",
  "Aujourd'hui on vise le clean sheet : zéro galère, zéro urgence à 15h57. 🧤",
  "Bienvenue dans Bref. : je suis arrivé, j'ai ouvert Teams, j'avais déjà 4 trucs à faire. 💻",
  "La journée vient de spawn. À vous de choisir le niveau de difficulté. 🎮",
  "On ne sait pas qui a besoin de lire ça, mais Ctrl+S. Maintenant. 💾",
  "Koh-Lanta, jour 12 : il reste du café et personne n'a encore touché au totem. 🗿",
  "Mario Kart du bureau : attention à la carapace bleue de 15h45 appelée « petite urgence ». 🐢",
  "Le vrai boss final n'est pas vendredi. C'est le mail « tu as 5 minutes ? ». 👀",
  "Aujourd'hui, pas besoin d'avoir 99 de général : collectif, café et ça joue. ⚽☕",
  "Objectif du jour : moins de bugs qu'un lancement de jeu AAA. On y croit. 🐛",
  "Si la journée était un épisode, on veut celui où tout se passe étonnamment bien. 🍿",
  "Alerte mercato : votre motivation vient de signer jusqu'à 16h. Option café incluse. ☕⚽",
  "Le multivers a été vérifié : dans toutes les timelines, il fallait quand même venir bosser. 🌀",
  "Petit rappel : « répondre à tous » est un pouvoir. Un grand pouvoir implique de grandes responsabilités. 🕷️",
  "La VAR confirme : oui, il est bien 8h30. Impossible d'annuler la journée. 📺⚽",
  "Votre barre d'énergie est pleine. Merci de ne pas tout dépenser avant 10h. 🔋",
  "GTA Bureau Edition : mission du jour ? terminer la to-do sans déclencher 3 missions secondaires. 🎮",
  "Aujourd'hui on joue en 4-3-3 : café, concentration, efficacité. Le pressing commence à 9h30. ⚽",
  "Pas de panique : même les Avengers avaient besoin de plusieurs films pour finir leur projet. 🦸",
  "Le Pokédex du bureau indique : collègue sauvage aperçu près de la machine à café. ☕",
  "Vendredi approche. Gardez les pneus, pas besoin de faire un pit-stop toutes les 20 minutes. 🏎️",
  "Le briefing est simple : bonne humeur, boulot propre et aucune réunion qui aurait pu être un message. 🤝",
  "8h30 : serveur lancé, équipe connectée. Bonne game à tous. 🟢",
  "Aujourd'hui, on veut du prime : pas celui d'Amazon, le vôtre. ✨",
  "Si quelqu'un demande : oui, ouvrir la boîte mail compte comme échauffement. 📩",
  "La prophétie disait qu'un jour tout serait à jour. Ce jour est peut-être aujourd'hui. 🔮",
  "Café récupéré +10 énergie. Bonjour des collègues +5 aura. Vous êtes prêts. ☕✨",
  "Le vendredi, c'est comme les arrêts de jeu : on sait que c'est presque fini, mais il faut rester concentré. ⚽",
  "Breaking news : une journée sans « urgence de dernière minute » serait actuellement en préparation. 📰",
  "Ce matin, choisissez votre personnage : productif, très productif ou « d'abord un café ». 🎮☕",
  "8h30. Aucun boss de Dark Souls n'a encore envoyé de mail. Profitons-en. ⚔️",
  "Le plan A : tout se passe bien. Le plan B : café. Le plan C : deuxième café. ☕",
  "Aujourd'hui on ne cherche pas le Ballon d'Or, juste une to-do avec quelques cases cochées. ✅⚽",
];

// ---------------------------------------------------------------------------
// Message "intelligent" : il reconnaît le jour, le mois, l'année et les dates
// particulières (fêtes, ponts, fin de mois…) et pioche des références réseaux
// sociaux en conséquence. Le choix reste déterministe : même date = même
// message (pas de doublon entre deux envois le même jour).
// ---------------------------------------------------------------------------

const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const NOMS_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Jours fériés (calcul local, pour les ponts / lendemains de férié).
function paques(annee) {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(annee, mois - 1, jour);
}
function cleJour(t) {
  return new Date(t).toISOString().slice(0, 10);
}
function feries(annee) {
  const p = paques(annee), j = 86400000;
  return new Set([
    Date.UTC(annee, 0, 1), p + j, Date.UTC(annee, 4, 1), Date.UTC(annee, 4, 8), p + 39 * j, p + 50 * j,
    Date.UTC(annee, 6, 14), Date.UTC(annee, 7, 15), Date.UTC(annee, 10, 1), Date.UTC(annee, 10, 11), Date.UTC(annee, 11, 25),
  ].map(cleJour));
}
function estOuvre(t) {
  const d = new Date(t), j = d.getUTCDay();
  return j !== 0 && j !== 6 && !feries(d.getUTCFullYear()).has(cleJour(t));
}
function dernierDimanche(annee, mois) {
  const d = new Date(Date.UTC(annee, mois + 1, 0));
  return d.getUTCDate() - d.getUTCDay();
}
function numeroSemaine(t) {
  const d = new Date(t);
  const jour = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - jour + 3);
  const premierJeudi = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - premierJeudi) / 86400000 - 3 + ((premierJeudi.getUTCDay() + 6) % 7)) / 7);
}

function contexte(date) {
  const iso = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const [annee, mois, jour] = iso.split("-").map(Number);
  const t = Date.UTC(annee, mois - 1, jour);
  const j = 86400000;
  const jourSemaine = new Date(t).getUTCDay();
  const debutAnnee = Date.UTC(annee, 0, 1);
  const finAnnee = Date.UTC(annee, 11, 31);
  // Prochain jour ouvré / jour ouvré précédent
  let suivant = t + j;
  while (!estOuvre(suivant)) suivant += j;
  let precedent = t - j;
  while (!estOuvre(precedent)) precedent -= j;
  // Jours fériés tombant en semaine entre deux dates (exclues) : un férié
  // un samedi ou un dimanche ne crée ni pont ni "retour de jour off".
  const feriesEnSemaineEntre = (a, b) => {
    let n = 0;
    for (let x = a + j; x < b; x += j) {
      const js = new Date(x).getUTCDay();
      if (js !== 0 && js !== 6 && feries(new Date(x).getUTCFullYear()).has(cleJour(x))) n++;
    }
    return n;
  };
  // Premier / dernier jour ouvré du mois
  let premierOuvre = Date.UTC(annee, mois - 1, 1);
  while (!estOuvre(premierOuvre)) premierOuvre += j;
  let dernierOuvre = Date.UTC(annee, mois, 0);
  while (!estOuvre(dernierOuvre)) dernierOuvre -= j;
  // 4e jeudi de novembre + 1 = Black Friday
  const premierNov = new Date(Date.UTC(annee, 10, 1)).getUTCDay();
  const thanksgiving = 1 + ((4 - premierNov + 7) % 7) + 21;
  return {
    iso, annee, mois, jour, t, jourSemaine,
    nomJour: NOMS_JOURS[jourSemaine],
    nomMois: NOMS_MOIS[mois - 1],
    deMois: /^[aeiouéèêh]/i.test(NOMS_MOIS[mois - 1]) ? `d'${NOMS_MOIS[mois - 1]}` : `de ${NOMS_MOIS[mois - 1]}`,
    numeroJour: Math.round((t - debutAnnee) / j) + 1,
    joursRestantsAnnee: Math.round((finAnnee - t) / j),
    semaine: numeroSemaine(t),
    joursAvantNoel: Math.round((Date.UTC(annee, 11, 25) - t) / j),
    veilleDePont: feriesEnSemaineEntre(t, suivant) > 0,
    // Plus de 2 jours non travaillés d'affilée = vrai week-end prolongé.
    weekEndProlonge: Math.round((suivant - t) / j) - 1 >= 3,
    lendemainDeFerie: feriesEnSemaineEntre(precedent, t) > 0,
    premierOuvreDuMois: t === premierOuvre,
    dernierOuvreDuMois: t === dernierOuvre,
    blackFriday: mois === 11 && jour === thanksgiving + 1,
    lendemainChangementHeure: jourSemaine === 1 && ((mois === 3 && jour - 1 === dernierDimanche(annee, 2)) || (mois === 10 && jour - 1 === dernierDimanche(annee, 9))),
    heureEte: mois === 3,
    rentree: mois === 9 && t === premierOuvre,
    anneesCFReseaux: annee - 2021 - (mois < 7 ? 1 : 0),
  };
}

// Dates particulières : prioritaires sur tout le reste.
function messageSpecial(c) {
  const md = `${String(c.mois).padStart(2, "0")}-${String(c.jour).padStart(2, "0")}`;
  const fixes = {
    "01-02": `POV : c'est le premier jour de boulot de ${c.annee} et ton cerveau est encore en mode replay du réveillon. On relance doucement. 🎆`,
    "01-06": "Épiphanie : aujourd'hui la seule réunion qui compte, c'est celle autour de la galette. Que la fève soit avec vous. 👑",
    "02-02": "Chandeleur : la vraie trend du jour, c'est la crêpe. Retourner la sienne sans la faire tomber = aura +1000. 🥞",
    "02-14": "Saint-Valentin : relation officielle avec votre to-do list. Pas de ghosting entre vous aujourd'hui. 💘",
    "03-08": "8 mars, journée internationale des droits des femmes. Big up à toutes celles qui font tourner la boutique au quotidien. 💜",
    "03-14": "Pi Day (3,14) : objectif du jour, être aussi infini que π… en motivation. Et peut-être une part de tarte. 🥧",
    "03-17": "Saint-Patrick : tout le monde en vert aujourd'hui… au moins dans le planning. 🍀",
    "04-01": "1er avril : si un collègue vous dit que la réunion de 9h est annulée, vérifiez d'abord votre dos. 🐟",
    "05-04": "May the 4th be with you. Que la Force soit avec vous… et avec la file d'attente de la machine à café. ✨",
    "06-21": "Fête de la musique : la playlist du bureau est officiellement ouverte. Vous êtes plutôt Aya Nakamura ou Daft Punk ? 🎶",
    "07-13": "Veille du 14 juillet : les feux d'artifice, c'est demain. Aujourd'hui, on fait juste péter la to-do list. 🎇",
    "10-01": "Journée mondiale du café : ce matin, votre tasse n'est pas un accessoire, c'est un sponsor officiel. ☕",
    "10-31": "Halloween : le vrai jump scare de la journée, c'est le mail qui commence par « petite question rapide ». 🎃",
    "12-24": "Veille de Noël : mode chocolat chaud activé, cerveau déjà au pied du sapin. Respect à ceux qui sont là. 🎄",
    "12-31": `Dernier jour de ${c.annee} : photo dump de l'année en préparation. Merci pour tout ce que vous avez fait cette année. 🥂`,
  };
  if (fixes[md]) return fixes[md];
  if (c.blackFriday) return "Black Friday : -50 % sur le stress, -70 % sur les urgences de 17h. Offre valable aujourd'hui uniquement. 🛍️";
  if (c.rentree) return "C'est la rentrée : nouvelle trousse mentale, agenda tout neuf et aucune envie d'ouvrir ses mails. On y va ensemble. ✏️";
  if (c.lendemainChangementHeure) {
    return c.heureEte
      ? "Lendemain du passage à l'heure d'été : on a perdu 1 heure de sommeil, mais on a gagné de la lumière. Le café fait le reste. ⏰☀️"
      : "Passage à l'heure d'hiver : 1 heure de sommeil en plus, et pourtant on a l'impression d'être en mode avion. Courage. ⏰";
  }
  if (c.jourSemaine === 5 && c.jour === 13) return "Vendredi 13 : jour de chance pour les uns, jour à éviter « répondre à tous » pour les autres. Croisez les doigts. 🍀";
  if (c.mois === 2 && c.jour === 29) return "29 février : un jour bonus qui n'existe qu'une fois tous les 4 ans. Rare comme un mail sans pièce jointe oubliée. 🦄";
  if (c.veilleDePont && c.weekEndProlonge) return "Dernier jour avant le week-end prolongé : on boucle proprement, on met le message d'absence et on file. 🌴";
  if (c.veilleDePont) return "Demain c'est férié : petite pause en milieu de semaine, comme une pub au milieu d'un épisode. On profite d'aujourd'hui à fond. 📺";
  if (c.lendemainDeFerie) return "Retour après le jour off : le cerveau charge encore, comme une story en 3G. Laissez-lui quelques minutes. 📶";
  if (c.dernierOuvreDuMois) return `Dernier jour ouvré ${c.deMois} : on fait le bilan, on coche ce qui reste et on ferme le mois en mode season finale. 📆`;
  if (c.premierOuvreDuMois) return `Premier jour ${c.deMois} : nouveau mois, nouvelle page. POV : vous allez tout gérer (on y croit très fort). ✨`;
  if (c.mois === 12 && c.joursAvantNoel > 0 && c.joursAvantNoel <= 10) return `Plus que ${c.joursAvantNoel} jours avant Noël. Le calendrier de l'Avent du bureau, c'est la to-do qui se vide case par case. 🎁`;
  return null;
}

// Un message par jour de la semaine (références réseaux sociaux).
const PAR_JOUR = {
  1: [
    "POV : c'est lundi, ton réveil a sonné et ton âme est restée sous la couette. Le café va la chercher. ☕",
    "Lundi = épisode 1 de la saison. Pas de spoiler, mais il paraît que le héros, c'est vous. 🎬",
    "Lundi : on ne parle pas de motivation, on parle de café et d'un petit « on verra bien ». 😌",
    "Le lundi, c'est le tutoriel de la semaine. Pas de panique si les commandes ne répondent pas tout de suite. 🎮",
    "Lundi : on manifeste une semaine calme. Délulu c'est la solulu. 🔮",
  ],
  2: [
    "Mardi : le lundi version DLC, sans l'effet de surprise. Ça devrait mieux se passer. 🎮",
    "Mardi, le jour où on est officiellement réveillés. GRWM : café, sourire, to-do. ☕",
    "Mardi : pas assez près du week-end pour rêver, assez loin du lundi pour respirer. Équilibre parfait. ⚖️",
    "Mardi, on est sur un vibe check positif : tout le monde en mode main character. ✨",
  ],
  3: [
    "Mercredi : on est au refrain de la semaine. Le moment où tout le monde connaît les paroles. 🎶",
    "Milieu de semaine : la story est à 50 %. Ne zappez pas, la suite est meilleure. 📱",
    "Mercredi : la montagne est à mi-pente. D'ici, la vue sur vendredi est déjà sympa. ⛰️",
    "Mercredi, jour du point d'étape : boire de l'eau, prendre l'air, valider deux tâches. Self-care validé. 💧",
  ],
  4: [
    "Jeudi : le vendredi en bande-annonce. On sent déjà l'ambiance du week-end, mais on finit le film. 🍿",
    "Jeudi, c'est le petit vendredi. Les vrais savent. 😏",
    "Jeudi : il reste une journée et demie. Rien ne peut nous arrêter (sauf une réunion à 16h45). ⏳",
    "Jeudi : on est sur la dernière ligne droite, mode Usain Bolt mais en version détendue. 🏃",
  ],
  5: [
    "Vendredi : main character energy jusqu'à 17h, puis mode avion jusqu'à lundi. ✈️",
    "TGIF : Thank God It's Friday. Aujourd'hui, chaque mail envoyé rapproche du week-end. 📩",
    "Vendredi : le moment de finir la semaine en beauté. Pas de « on verra lundi », on verra… lundi. 😎",
    "C'est vendredi : la semaine est presque dans la boîte, comme un reel monté juste avant de poster. 🎞️",
    "Vendredi, le seul jour où ouvrir sa boîte mail ressemble à un compte à rebours. 3, 2, 1… week-end. 🚀",
  ],
};

// Une touche du mois / de la saison.
const PAR_MOIS = {
  1: ["Janvier : « nouvelle année, nouveau moi » version bureau. Le nouveau moi range déjà son bureau. Respect. 🧹", "Dry January pour certains, Dry Inbox pour tous : objectif boîte mail vide. 📭"],
  2: ["Février : le mois le plus court de l'année. Idéal pour faire semblant d'avoir tout prévu. 🗓️", "Février : il fait froid dehors, mais l'ambiance au bureau reste en mode été. ❄️☀️"],
  3: ["Mars : le printemps arrive, les jours rallongent. Les to-do lists aussi, malheureusement. 🌸", "Mars : saison des giboulées. Prévoyez un parapluie et une bonne dose de bonne humeur. ☔"],
  4: ["Avril : ne te découvre pas d'un fil… mais découvre ta to-do du jour, elle t'attend. 🧥", "Avril : le soleil revient, la team commence à rêver de terrasses. Encore un peu de patience. ☀️"],
  5: ["Mai : le mois des ponts. Le vrai sport national, c'est le calcul de RTT. 🧮", "Mai : les beaux jours sont là. Le bureau est officiellement en mode printemps. 🌷"],
  6: ["Juin : la fin d'année scolaire approche, et tout le monde a l'énergie d'un dernier jour de cours. 📚", "Juin : l'été frappe à la porte. Gardez la clim et le moral au maximum. 🌞"],
  7: ["Juillet : saison des vacances. Ceux qui restent sont les vrais héros du bureau. 🦸", "Juillet : l'out-of-office le plus attendu de l'année se prépare. Courage aux présents. 🏖️"],
  8: ["Août : le bureau est calme, la boîte mail aussi. Profitez-en, c'est rare comme un mail sans « urgent ». 🌴", "Août : ambiance vacances même au bureau. On garde le cap, la rentrée est loin (ou pas). ⛱️"],
  9: ["Septembre : la rentrée est là, les bonnes résolutions aussi. On garde celles d'il y a deux semaines ? 📒", "Septembre : nouvelle saison, nouveaux objectifs. Le season premiere, c'est maintenant. 🎬"],
  10: ["Octobre : saison des pulls et des plaids. Le bureau en mode cozy, c'est validé. 🍂", "Octobre : les feuilles tombent, les tâches aussi (dans la colonne « terminé »). 🍁"],
  11: ["Novembre : il fait gris dehors, mais la team garde le moral en mode soleil intérieur. 🌧️☀️", "Novembre : Movember pour les uns, motivation pour tous. Laissez pousser les bonnes idées. 🥸"],
  12: ["Décembre : bientôt le Spotify Wrapped de l'année. Le vôtre au boulot ? « Top artiste : la to-do list ». 🎧", "Décembre : mode chocolat chaud et pull de Noël activé. La fin d'année approche. ☕🎄"],
};

// Petits calculs du jour.
function messagesCalcules(c) {
  return [
    `Jour ${c.numeroJour} de ${c.annee}, semaine ${c.semaine}. Petit rappel : il reste ${c.joursRestantsAnnee} jours pour cocher la bucket list de l'année. 📊`,
    `Semaine ${c.semaine} : à ce stade de l'année, on est en mode « expérimenté », plus en mode tuto. 🎮`,
    `${c.nomJour.charAt(0).toUpperCase() + c.nomJour.slice(1)} ${c.jour} ${c.nomMois} ${c.annee} : une date qui mérite d'être une bonne journée. On s'y met ? ✅`,
    ...(c.anneesCFReseaux >= 1 ? [`CF Réseaux, ${c.anneesCFReseaux} an${c.anneesCFReseaux > 1 ? "s" : ""} d'aventure et toujours la même énergie. Bonne journée à toute l'équipe. ⚡`] : []),
  ];
}

// Hachage simple et stable d'une chaîne.
function hachage(texte) {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function messageDuJour(date = new Date()) {
  const c = contexte(date);
  const special = messageSpecial(c);
  if (special) return special;

  const graine = hachage(c.iso);
  const familles = [
    PAR_JOUR[c.jourSemaine] || [],
    PAR_JOUR[c.jourSemaine] || [],
    PAR_MOIS[c.mois] || [],
    messagesCalcules(c),
    [...new Set(MESSAGES_QUOTIDIENS)],
  ].filter((f) => f.length);
  const famille = familles[graine % familles.length];
  return famille[Math.floor(graine / familles.length) % famille.length];
}
