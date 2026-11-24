// Avatar pingouin de l'apparence Noël : chaque collaborateur reçoit l'un des
// pingouins de public/noel/avatars, tiré au hasard à partir de son
// identifiant. Le tirage est « figé » (même pingouin à chaque visite, sur
// tous les écrans et pour tout le monde), sans rien stocker en base.
//
// Pingouins réservés (jamais tirés au hasard pour les autres) :
//   - Thierry : il joue à la console, manette en main ;
//   - Léa G. : elle porte son petit (pingouin n° 5).
const RESERVES = [
  { ok: (prenom) => prenom === "thierry", image: "pingouin-thierry.svg" },
  { ok: (prenom, nom) => prenom === "lea" && nom.startsWith("g"), image: "pingouin-05.webp" },
];
const TIRAGE = Array.from({ length: 16 }, (_, i) => i + 1)
  .filter((n) => n !== 5)
  .map((n) => `pingouin-${String(n).padStart(2, "0")}.webp`);

const normaliser = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// prenom / nom facultatifs ; sinon « nomComplet » (« Prénom Nom »).
export function avatarNoel(id, prenom, nom, nomComplet) {
  let p = normaliser(prenom);
  let n = normaliser(nom);
  if (!p && nomComplet) {
    const [premier, ...reste] = normaliser(nomComplet).split(/\s+/);
    p = premier || "";
    n = reste.join(" ");
  }
  const reserve = RESERVES.find((r) => r.ok(p, n));
  if (reserve) return `/noel/avatars/${reserve.image}`;

  // Hachage FNV-1a de l'identifiant, puis mélange final (murmur3 fmix32) :
  // les identifiants se ressemblent beaucoup (mêmes préfixes), sans ce
  // mélange plusieurs collègues tomberaient sur le même pingouin.
  let h = 0x811c9dc5;
  for (const c of String(id || "")) {
    h = (h ^ c.charCodeAt(0)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return `/noel/avatars/${TIRAGE[h % TIRAGE.length]}`;
}
