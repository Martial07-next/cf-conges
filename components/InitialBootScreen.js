"use client";

import { useEffect, useState } from "react";
import EcranChargement from "./EcranChargement";

const DUREE_FONDU_MS = 180;

export default function InitialBootScreen() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let retrait;

    const masquerQuandPret = () => {
      setClosing(true);
      retrait = window.setTimeout(() => setVisible(false), DUREE_FONDU_MS);
    };

    if (document.readyState === "complete") {
      masquerQuandPret();
    } else {
      window.addEventListener("load", masquerQuandPret, { once: true });
    }

    return () => {
      window.removeEventListener("load", masquerQuandPret);
      if (retrait) window.clearTimeout(retrait);
    };
  }, []);

  if (!visible) return null;

  return (
    <EcranChargement
      style={{ opacity: closing ? 0 : 1, transition: `opacity ${DUREE_FONDU_MS}ms ease-out`, pointerEvents: "all" }}
    />
  );
}
