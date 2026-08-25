"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushNotificationToggle() {
  const [supporte, setSupporte] = useState(true);
  const [actif, setActif] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupporte(false);
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setActif(!!sub);
    });
  }, []);

  async function activer() {
    setLoading(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Autorisation refusée. Active les notifications dans les réglages de ton navigateur.");
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setActif(true);
      setMessage("Notifications activées ✓");
    } catch (e) {
      setMessage("Erreur lors de l'activation.");
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
      {message && <p className="text-xs text-brand-dark/50 mt-2">{message}</p>}
    </div>
  );
}
