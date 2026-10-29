// Catégories des liens utiles du tableau de bord.
export const CATEGORIES_LIENS = {
  SITE: { label: "Sites", icone: "🌐" },
  VIDEO: { label: "Vidéos", icone: "▶️" },
  DOCUMENT: { label: "Documents", icone: "📄" },
  OUTIL: { label: "Outils", icone: "🛠️" },
};

// Catégorie proposée automatiquement d'après l'adresse.
export function categorieDepuisUrl(url) {
  const u = String(url || "").toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|\.mp4($|\?)/.test(u)) return "VIDEO";
  if (/\.(pdf|docx?|xlsx?|pptx?)($|\?)|docs\.google\.com|drive\.google\.com|sharepoint\.com/.test(u)) return "DOCUMENT";
  return "SITE";
}

// Adresse http(s) valide, sinon null.
export function urlValide(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
