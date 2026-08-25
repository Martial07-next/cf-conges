"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String) {
  // Nettoie les espaces/retours a la ligne/guillemets qui peuvent s'etre
  // glisses lors du copier-coller de la cle VAPID dans Vercel.
  const clean = base64String.trim().replace(/["'\s]/g, "");
  const padding = "=".repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function estModeInstalle() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function PushNotificationToggle() {
  const [supporte, setSupporte] = useState(true);
  const [installe, setInstalle] = useState(true);
  const [actif, setActif] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupporte(false);
      return;
    }
    setInstalle(estModeInstalle());
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setActif(!!sub);
    });
  }, []);

  async function activer() {
    setLoading(true);
    setMessage("");
    setErreur(false);

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setMessage(
        "Configuration manquante côté serveur (NEXT_PUBLIC_VAPID_PUBLIC_KEY absente). Contacte l'administrateur : la variable doit être ajoutée sur Vercel puis le site redéployé."
      );
      setErreur(true);
      setLoading(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Autorisation refusée. Active les notifications dans les réglages de ton navigateur pour ce site, puis réessaie.");
        setErreur(true);
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Le serveur a refusé l'abonnement (code ${res.status}).`);
      }
      setActif(true);
      setMessage("Notifications activées ✓");
    } catch (e) {
      setMessage(`Erreur lors de l'activation : ${e.name ? e.name + " — " : ""}${e.message || "cause inconnue"}`);
      setErreur(true);
    }
    setLoading(false);
  }

  async function desactiver() {
    setLoading(true);
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setActif(false);
    setLoading(false);
  }

  if (!supporte) {
    return (
      <p className="text-xs text-brand-dark/50">
        Ton navigateur ne supporte pas les notifications. Sur iPhone : ajoute d'abord ce site à l'écran d'accueil (Partager → Sur l'écran d'accueil), puis reviens ici depuis l'icône ajoutée.
      </p>
    );
  }

  if (!installe) {
    return (
      <p className="text-xs text-brand-dark bg-brand-yellow/15 border border-brand-yellow/40 rounded-xl px-3 py-2.5">
        Tu utilises encore l'onglet du navigateur. Sur iPhone, les notifications ne fonctionnent que depuis l'icône ajoutée à l'écran d'accueil — ferme cet onglet Safari et rouvre l'app depuis son icône sur ton écran d'accueil.
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={actif ? desactiver : activer}
        disabled={loading}
        className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
          actif ? "bg-alert-soft/10 text-alert-soft hover:bg-alert-soft/20" : "bg-brand-green hover:bg-brand-greendark hover:text-white text-brand-dark"
        }`}
      >
        {loading ? "…" : actif ? "Désactiver les notifications" : "Activer les notifications sur cet appareil"}
      </button>
      {message && (
        <p className={`text-xs mt-2 ${erreur ? "text-alert-soft" : "text-brand-dark/50"}`}>{message}</p>
      )}
    </div>
  );
}
