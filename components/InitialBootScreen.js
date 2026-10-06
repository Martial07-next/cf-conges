"use client";

import { useEffect, useState } from "react";

export default function InitialBootScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Le RootLayout ne remonte pas pendant la navigation interne : cet écran
    // est réservé au démarrage initial de l'application. On le conserve
    // jusqu'à la fin du chargement du document afin qu'il couvre aussi
    // l'authentification et le rendu serveur du dashboard.
    let frame;

    const masquerQuandPret = () => {
      frame = requestAnimationFrame(() => setVisible(false));
    };

    if (document.readyState === "complete") {
      masquerQuandPret();
    } else {
      window.addEventListener("load", masquerQuandPret, { once: true });
    }

    return () => {
      window.removeEventListener("load", masquerQuandPret);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Chargement de CF Congés"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--boot-bg)",
        color: "var(--boot-text)",
        opacity: visible ? 1 : 0,
        transition: "opacity 140ms ease-out",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div style={{ fontSize: "44px", lineHeight: 1, marginBottom: "18px" }}>⚡</div>
        <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.2em", marginBottom: "8px" }}>
          CF CONGÉS
        </div>
        <div style={{ fontSize: "25px", fontWeight: 800 }}>On prépare ton espace...</div>
        <div style={{ fontSize: "14px", opacity: 0.58, marginTop: "8px" }}>
          Vérification de ton accès et chargement de tes données
        </div>
        <div style={{ height: "9px", overflow: "hidden", borderRadius: "999px", background: "rgba(22,35,26,.09)", marginTop: "26px" }}>
          <div className="cf-boot-progress" style={{ height: "100%", width: "35%", borderRadius: "999px", background: "#6CB64D" }} />
        </div>
        <div style={{ fontSize: "11px", opacity: 0.38, marginTop: "12px" }}>
          Aucun bouton à toucher, on s'occupe de tout 😎
        </div>
        <style>{`
          @keyframes cfBootProgress {
            from { transform: translateX(-120%); }
            to { transform: translateX(420%); }
          }
          .cf-boot-progress {
            animation: cfBootProgress 1.1s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
