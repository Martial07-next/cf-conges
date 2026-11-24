// Avatar pingouin de l'apparence Noël : chaque collaborateur reçoit l'un des
// 16 pingouins (public/noel/avatars), tiré au hasard à partir de son
// identifiant. Le tirage est « figé » (même pingouin à chaque visite, sur
// tous les écrans et pour tout le monde), sans rien stocker en base.
export const NB_PINGOUINS = 16;

export function avatarNoel(id) {
  // Hachage FNV-1a de l'identifiant : répartition uniforme et stable.
  let h = 0x811c9dc5;
  for (const c of String(id || "")) {
    h = (h ^ c.charCodeAt(0)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Mélange final (murmur3 fmix32) : les identifiants se ressemblent
  // beaucoup (mêmes préfixes), sans lui plusieurs collègues tomberaient sur
  // le même pingouin.
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  const n = (h % NB_PINGOUINS) + 1;
  return `/noel/avatars/pingouin-${String(n).padStart(2, "0")}.webp`;
}
