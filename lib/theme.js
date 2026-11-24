// Apparences de la plateforme. « noel » est l'apparence par défaut pendant
// les fêtes ; « clair » et « sombre » restent disponibles dans le profil.
export const THEMES = ["noel", "clair", "sombre"];
export const THEME_DEFAUT = "noel";

export function themeValide(t) {
  return THEMES.includes(t) ? t : THEME_DEFAUT;
}

// Applique l'apparence sur la page (classes de <html>) et la retient sur
// l'appareil pour le prochain chargement (script de app/layout.js).
export function appliquerTheme(t) {
  const theme = themeValide(t);
  const html = document.documentElement;
  html.classList.toggle("dark", theme === "sombre" || theme === "noel");
  html.classList.toggle("noel", theme === "noel");
  try {
    localStorage.setItem("cf-theme", theme);
  } catch {}
}
