// Décor animé de l'apparence Noël : ciel dégradé, lune, traîneau, et un
// village qui défile en parallaxe (montagnes, forêt, maisons, congères),
// comme si l'on voyageait à travers un village de Noël. Affiché seulement
// avec la classe « noel » sur <html> (globals.css), derrière le contenu.
const COUCHES = [
  { nom: "montagnes", hauteur: 300, bas: 150, duree: 240 },
  { nom: "foret", hauteur: 240, bas: 95, duree: 150 },
  { nom: "village", hauteur: 220, bas: 45, duree: 95 },
  { nom: "neige-sol", hauteur: 160, bas: 0, duree: 55 },
];

export default function VillageNoel() {
  return (
    <div aria-hidden className="cf-village">
      <div className="cf-village-lune" />
      <div className="cf-village-traineau" />
      {COUCHES.map((c) => (
        <div
          key={c.nom}
          className="cf-village-couche"
          style={{
            height: `${c.hauteur}px`,
            bottom: `${c.bas}px`,
            backgroundImage: `url(/noel/${c.nom}.svg)`,
            animationDuration: `${c.duree}s`,
          }}
        />
      ))}
    </div>
  );
}
