"use client";

import { useState, useEffect } from "react";
import { Card } from "./ui";

const ANNEE_COURANTE = new Date().getFullYear();

export default function BalanceEditor({ users, leaveTypes }) {
  const [userId, setUserId] = useState(users[0]?.id || "");
  const [annee, setAnnee] = useState(ANNEE_COURANTE);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/leave-balances?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setBalances(Array.isArray(data) ? data.filter((b) => b.annee === annee) : []))
      .finally(() => setLoading(false));
  }, [userId, annee]);

  function valueFor(leaveTypeId, field) {
    const existing = balances.find((b) => b.leaveTypeId === leaveTypeId);
    return existing ? existing[field] : 0;
  }

  async function handleSave(leaveTypeId, joursAcquis, joursPris) {
    setSaving(leaveTypeId);
    setMessage("");
    const res = await fetch("/api/leave-balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, leaveTypeId, annee, joursAcquis, joursPris }),
    });
    const data = await res.json();
    setSaving(null);
    if (res.ok) {
      setBalances((prev) => [...prev.filter((b) => b.leaveTypeId !== leaveTypeId), data]);
      setMessage("Enregistré ✓");
    } else {
      setMessage(data.error || "Erreur.");
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Collaborateur</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none min-w-[220px]">
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.prenom} {u.nom}{u.service ? ` — ${u.service}` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-brand-dark/60 mb-1">Année</label>
          <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none">
            {[ANNEE_COURANTE - 1, ANNEE_COURANTE, ANNEE_COURANTE + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        {message && <span className="text-sm text-brand-greendark">{message}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-brand-dark/50">Chargement…</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-brand-dark/50 border-b border-black/5">
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Jours acquis</th>
              <th className="py-2 pr-4">Jours pris</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {leaveTypes.map((t) => (
              <BalanceRow key={t.id} type={t} acquisInit={valueFor(t.id, "joursAcquis")} prisInit={valueFor(t.id, "joursPris")} saving={saving === t.id} onSave={handleSave} />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function BalanceRow({ type, acquisInit, prisInit, saving, onSave }) {
  const [acquis, setAcquis] = useState(acquisInit);
  const [pris, setPris] = useState(prisInit);

  useEffect(() => { setAcquis(acquisInit); setPris(prisInit); }, [acquisInit, prisInit]);

  return (
    <tr className="border-b border-black/5 last:border-0">
      <td className="py-2.5 pr-4">
        <span className="inline-flex items-center gap-1.5 font-medium text-brand-dark">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.couleur }} />
          {type.code}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <input type="number" step="0.5" value={acquis} onChange={(e) => setAcquis(Number(e.target.value))} className="w-24 px-2 py-1.5 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none" />
      </td>
      <td className="py-2.5 pr-4">
        <input type="number" step="0.5" value={pris} onChange={(e) => setPris(Number(e.target.value))} className="w-24 px-2 py-1.5 rounded-lg border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none" />
      </td>
      <td className="py-2.5">
        <button onClick={() => onSave(type.id, acquis, pris)} disabled={saving} className="text-xs font-semibold text-brand-greendark hover:underline">
          {saving ? "…" : "Enregistrer"}
        </button>
      </td>
    </tr>
  );
}
