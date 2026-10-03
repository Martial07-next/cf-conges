export const MESSAGES_QUOTIDIENS = [
  "8h30. Le café est chargé, la quête principale peut commencer. ☕🎮",
  "Aujourd'hui, objectif simple : faire mieux que le Wi-Fi de la salle de réunion. 📶",
  "Le conseil s'est réuni : vous êtes officiellement attendus pour carry la journée. 🏆",
  "Mode Ligue des Champions activé. Pas de match retour, alors on joue la journée à fond. ⚽",
  "C'est lundi ? On appelle ça le tutoriel. La vraie partie commence maintenant. 🎮",
  "Plot twist : cette réunion aurait peut-être pu être un mail. Bonne journée quand même. 😌",
  "Votre mission, si vous l'acceptez : arriver à 17h avec encore 12 % de batterie sociale. 🔋",
  "Le café a utilisé Attaque Rapide. C'est super efficace. ☕⚡",
  "Aujourd'hui on vise le clean sheet : zéro galère, zéro urgence à 16h57. 🧤",
  "Bienvenue dans Bref. : je suis arrivé, j'ai ouvert Teams, j'avais déjà 4 trucs à faire. 💻",
  "La journée vient de spawn. À vous de choisir le niveau de difficulté. 🎮",
  "On ne sait pas qui a besoin de lire ça, mais Ctrl+S. Maintenant. 💾",
  "Koh-Lanta, jour 12 : il reste du café et personne n'a encore touché au totem. 🗿",
  "Mario Kart du bureau : attention à la carapace bleue de 16h45 appelée « petite urgence ». 🐢",
  "Le vrai boss final n'est pas vendredi. C'est le mail « tu as 5 minutes ? ». 👀",
  "Aujourd'hui, pas besoin d'avoir 99 de général : collectif, café et ça joue. ⚽☕",
  "Objectif du jour : moins de bugs qu'un lancement de jeu AAA. On y croit. 🐛",
  "Si la journée était un épisode, on veut celui où tout se passe étonnamment bien. 🍿",
  "Alerte mercato : votre motivation vient de signer jusqu'à 17h. Option café incluse. ☕⚽",
  "Le multivers a été vérifié : dans toutes les timelines, il fallait quand même venir bosser. 🌀",
  "Petit rappel : « répondre à tous » est un pouvoir. Un grand pouvoir implique de grandes responsabilités. 🕷️",
  "La VAR confirme : oui, il est bien 8h30. Impossible d'annuler la journée. 📺⚽",
  "Votre barre d'énergie est pleine. Merci de ne pas tout dépenser avant 10h. 🔋",
  "GTA Bureau Edition : mission du jour — terminer la to-do sans déclencher 3 missions secondaires. 🎮",
  "Aujourd'hui on joue en 4-3-3 : café, concentration, efficacité. Le pressing commence à 8h30. ⚽",
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

export function messageDuJour() {
  const maintenant = new Date();
  const dateParis = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
  const [annee, mois, jour] = dateParis.split("-").map(Number);
  const debutAnnee = Date.UTC(annee, 0, 1);
  const jourAnnee = Math.floor((Date.UTC(annee, mois - 1, jour) - debutAnnee) / 86400000);
  return MESSAGES_QUOTIDIENS[jourAnnee % MESSAGES_QUOTIDIENS.length];
}
