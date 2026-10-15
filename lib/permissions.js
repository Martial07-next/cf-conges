// Les "onglets" optionnels sont des espaces que l'Admin peut accorder ou retirer
// individuellement, indépendamment du rôle formel du compte. Le rôle continue de
// définir un accès par défaut à la création, mais l'Admin peut ensuite l'ajuster
// finement par utilisateur (§4D du cahier des charges : autonomie complète).
export const OPTIONAL_TABS = [
  { key: "comptable", label: "Espace comptable", href: "/comptable" },
  { key: "tr", label: "Gestionnaire TR", href: "/tr" },
  { key: "employeur", label: "Validation & accès", href: "/employeur" },
  { key: "admin", label: "Administration", href: "/admin" },
];

export function defaultOngletsForRole(role) {
  if (role === "ADMIN") return ["comptable", "employeur", "admin"];
  if (role === "EMPLOYEUR") return ["employeur"];
  if (role === "COMPTABLE") return ["comptable"];
  return [];
}

// user = { role, onglets } : fonctionne aussi bien avec un objet session.user
// qu'avec le token JWT du middleware (mêmes champs portés dans les callbacks).
export function canAccess(user, tab) {
  if (!user) return false;
  if (user.role === "ADMIN") return true; // l'administrateur garde toujours un accès total
  const onglets = user.onglets ?? defaultOngletsForRole(user.role);
  return onglets.includes(tab);
}

export function canAccessAny(user, tabs) {
  return tabs.some((t) => canAccess(user, t));
}

// Un Cadre est le référent d'un pôle : il traite les demandes de congé des
// collaborateurs de son pôle (jamais les siennes), comme l'Employeur / RH
// mais limité à son équipe.
export function estCadre(user) {
  return user?.role === "CADRE" && !!user?.pole;
}

// user = session.user ; demandeur = { id, pole } de l'auteur de la demande.
export function peutTraiterDemandeDe(user, demandeur) {
  if (!user || !demandeur) return false;
  if (canAccess(user, "employeur")) return true;
  return estCadre(user) && demandeur.id !== user.id && demandeur.pole === user.pole;
}
