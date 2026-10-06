"use client";

import { useEffect, useState } from "react";

const DUREE_MINIMALE_MS = 5000;
const DUREE_FONDU_MS = 350;

export default function InitialBootScreen() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const debut = Date.now();
    let timer;
    let retrait;

    const masquerQuandPret = () => {
      const attenteRestante = Math.max(0, DUREE_MINIMALE_MS - (Date.now() - debut));
      timer = window.setTimeout(() => {
        setClosing(true);
        retrait = window.setTimeout(() => setVisible(false), DUREE_FONDU_MS);
      }, attenteRestante);
    };

    if (document.readyState === "complete") {
      masquerQuandPret();
    } else {
      window.addEventListener("load", masquerQuandPret, { once: true });
    }

    return () => {
      window.removeEventListener("load", masquerQuandPret);
      if (timer) window.clearTimeout(timer);
      if (retrait) window.clearTimeout(retrait);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Chargement de CF Congés"
      aria-live="polite"
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
        opacity: closing ? 0 : 1,
        transition: `opacity ${DUREE_FONDU_MS}ms ease-out`,
        pointerEvents: "all",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div className="cf-boot-emoji" style={{ fontSize: "44px", lineHeight: 1, marginBottom: "18px" }}>⚡</div>
        <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.2em", marginBottom: "8px" }}>
          CF CONGÉS
        </div>
        <div style={{ fontSize: "25px", fontWeight: 800 }}>On prépare ton espace...</div>
        <div style={{ fontSize: "14px", opacity: 0.58, marginTop: "8px" }}>
          Vérification de ton accès et chargement de tes données
        </div>
        <div style={{ height: "9px", overflow: "hidden", borderRadius: "999px", background: "rgba(127,127,127,.14)", marginTop: "26px" }}>
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
          @keyframes cfBootEmoji {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-5px) scale(1.05); }
          }
          .cf-boot-progress {
            animation: cfBootProgress 1.1s ease-in-out infinite;
            will-change: transform;
          }
          .cf-boot-emoji {
            animation: cfBootEmoji 1.4s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .cf-boot-progress, .cf-boot-emoji { animation: none; }
          }
        `}</style>
      </div>
    </div>
  );
}
