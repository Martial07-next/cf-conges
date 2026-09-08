export const MESSAGES_QUOTIDIENS = [
  "Je suis pas débutante, je suis professionnelle 😎",
];

export function messageDuJour() {
  const jourAnnee = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return MESSAGES_QUOTIDIENS[jourAnnee % MESSAGES_QUOTIDIENS.length];
}
