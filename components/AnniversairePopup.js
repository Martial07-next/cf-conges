"use client";

import { useEffect, useState } from "react";

// Pop-up "Joyeux anniversaire", affichée une seule fois le jour J.
export default function AnniversairePopup({ prenom, dateISO }) {
  const [visible, setVisible] = useState(false);
  const cle = `cf-anniversaire-vu-${dateISO}`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(cle)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [cle]);

  function fermer() {
    try {
      localStorage.setItem(cle, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={fermer}>
      <div className="bg-white rounded-2xl shadow-card border border-black/5 p-7 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-6xl mb-3 animate-bounce">🎂</div>
        <h2 className="font-bold text-brand-dark text-xl mb-2">Joyeux anniversaire {prenom} !</h2>
        <p className="text-sm text-brand-dark/70 mb-6">
          Toute l'équipe CF Réseaux te souhaite une excellente journée 🎉
        </p>
        <button
          onClick={fermer}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-greendark text-sm font-semibold text-brand-dark hover:text-white transition-colors"
        >
          Merci !
        </button>
      </div>
    </div>
  );
}
