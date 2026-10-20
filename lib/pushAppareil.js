// Côté navigateur : l'abonnement push appartient à l'APPAREIL. Sans ces
// fonctions, un téléphone restait lié au dernier compte qui avait activé
// les notifications, et continuait de recevoir ses notifications même une
// fois connecté avec un autre compte (ex. compte admin puis compte alternant).

async function abonnementDeCetAppareil() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

// Rattache l'abonnement de cet appareil (s'il existe) au compte connecté.
export async function rattacherAppareilAuCompte() {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const sub = await abonnementDeCetAppareil();
    if (!sub) return;
    await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch {
    // Best-effort : ne bloque jamais la navigation.
  }
}

// À la déconnexion : cet appareil ne reçoit plus les notifications du compte.
export async function detacherAppareilDuCompte() {
  try {
    const sub = await abonnementDeCetAppareil();
    if (!sub) return;
    await fetch("/api/push-subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {
    // Best-effort : la déconnexion continue quoi qu'il arrive.
  }
}

// Déconnexion qui détache d'abord l'appareil.
export async function seDeconnecter(signOut, options = { callbackUrl: "/login" }) {
  await detacherAppareilDuCompte();
  try {
    sessionStorage.removeItem("cf-push-appareil-lie");
  } catch {}
  return signOut(options);
}
