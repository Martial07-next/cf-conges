export const MESSAGES_QUOTIDIENS = [
  "Belle journée à vous ! On espère qu'elle sera légère et agréable. ☀️",
  "Un petit coucou pour bien démarrer la journée, prenez soin de vous aujourd'hui. 🌿",
  "N'oubliez pas de faire une vraie pause déjeuner, vous le méritez. 🍽️",
  "Journée productive en vue ? On croise les doigts avec vous. 💪",
  "Petit rappel amical : vous faites du bon travail. Continuez comme ça ! 🌟",
  "Un café, un sourire, et c'est parti pour une belle journée. ☕",
  "Pensez à vous étirer un peu entre deux tâches, le corps vous dira merci. 🙂",
  "Bonne journée à toute l'équipe CF Réseaux, merci pour votre engagement. 🤝",
  "Un jour de plus, une occasion de plus de faire de belles choses. Bon courage !",
  "Petit message du vendredi : bravo pour cette semaine, profitez du week-end qui arrive.",
  "Prenez un instant pour respirer, tout roule. Bonne journée !",
  "L'équipe pense à vous, passez une journée sereine.",
];

export function messageDuJour() {
  const jourAnnee = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return MESSAGES_QUOTIDIENS[jourAnnee % MESSAGES_QUOTIDIENS.length];
}
