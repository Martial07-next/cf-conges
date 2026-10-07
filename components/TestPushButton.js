"use client";

import { useState } from "react";

export default function TestPushButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function tester() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/test-push", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`);
      }

      setMessage("Notification test envoyée sur tes appareils abonnés ✓");
    } catch (e) {
      setMessage(`Erreur : ${e.message || "cause inconnue"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={tester}
        disabled={loading}
        className="rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-brand-dark transition-opacity disabled:opacity-60"
      >
        {loading ? "Envoi…" : "Tester ma notification push"}
      </button>
      {message && <p className="mt-2 text-xs text-brand-dark/60">{message}</p>}
    </div>
  );
}
