const MOTS_DE_PASSE_INTERDITS = new Set([
  "password", "password123", "motdepasse", "motdepasse123",
  "123456789012", "azertyuiop123", "qwertyuiop123",
  "admin12345678", "bienvenue123", "cfreseaux123",
]);

export function validerMotDePasse(password, email = "") {
  if (typeof password !== "string" || password.length < 12) {
    return "Le mot de passe doit contenir au moins 12 caractères.";
  }

  const normalise = password.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (MOTS_DE_PASSE_INTERDITS.has(normalise)) {
    return "Ce mot de passe est trop courant. Choisissez un mot de passe plus difficile à deviner.";
  }

  const emailNormalise = String(email).toLowerCase().trim();
  const identifiant = emailNormalise.split("@")[0]?.replace(/[^a-z0-9]/g, "");
  if (identifiant && identifiant.length >= 4 && normalise.includes(identifiant)) {
    return "Le mot de passe ne doit pas contenir votre adresse email.";
  }

  return null;
}
