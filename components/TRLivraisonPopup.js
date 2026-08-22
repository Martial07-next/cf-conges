"use client";

import { useEffect, useState } from "react";

export default function TRLivraisonPopup() {
  const [notif, setNotif] = useState(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        const trouvee = (data || []).find((n) => n.type === "Tickets restaurant livrés" && !n.lu);
        if (trouvee) setNotif(trouvee);
      });
  }, []);

  async function fermer() {
    if (!notif) return;
    await fetch(`/api/notifications/${notif.id}`, { method: "PATCH" });
    setNotif(null);
  }

  if (!notif) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-card border border-black/5 p-6 max-w-sm w-full">
        <h2 className="font-bold text-brand-dark text-lg mb-2">🍽️ Tickets restaurant livrés</h2>
        <p className="text-sm text-brand-dark/70 mb-5">{notif.message}</p>
        <button
          onClick={fermer}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-greendark text-sm font-semibold text-brand-dark"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
