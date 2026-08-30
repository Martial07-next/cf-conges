export const MESSAGES_QUOTIDIENS = [
  "Le flambeau, c'est vous qui l'avez aujourd'hui. 🔥",
  "Six seven. Bonne journée, on ne développe pas plus.",
  "PNJ mode activé ce matin ? Un café et ça repart.",
  "Chokbar cette équipe, franchement.",
  "Glow up de la semaine en cours, on le sent.",
  "Grosse aura aujourd'hui, on continue comme ça.",
  "Sigma grindset activé, bonne journée à tous.",
  "Askip c'est déjà l'heure de bosser. Courage.",
  "C'est carré aujourd'hui, on garde le rythme.",
  "No cap, cette semaine passe trop vite.",
  "Un vrai banger de journée en préparation.",
  "Elle a tout rizzé cette équipe, franchement.",
  "Victor si personne n'avait envoyé ce message ce matin. Bonne journée !",
  "Skibidi ou pas, il est l'heure de se lever.",
  "On garde le glow up jusqu'au bout de la semaine.",
  "On garde le cap toute la journée.",
  "Un vrai carry, cette équipe, chaque jour.",
  "Petite pensée sympa pour démarrer.",
  "Ça tourne bien, on continue sur cette lancée.",
  "T'es GOAT, on te le redit.",
  "On fracasse cette journée ensemble.",
  "Ça capte direct aujourd'hui.",
  "Un vrai bon jour pour avancer.",
  "On tient bon, comme toujours.",
  "Ça part bien ce matin.",
  "Tu attends toujours ta paie ? Spoil : C'est pas maintenant :)",
];

export function messageDuJour() {
  const jourAnnee = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return MESSAGES_QUOTIDIENS[jourAnnee % MESSAGES_QUOTIDIENS.length];
}
